import { z } from 'zod';

import type { DefineTool, ToolDeps } from '../shared/agent/tool.helpers.js';
import { success, error } from '../shared/agent/tool.helpers.js';

/**
 * Creates negotiation MCP tools for external agent access.
 * Exposes negotiation state for listing, reading, and responding to bilateral negotiations.
 */
export function createNegotiationTools(defineTool: DefineTool, deps: ToolDeps) {
  const { negotiationDatabase } = deps;

  const list_negotiations = defineTool({
    name: 'list_negotiations',
    description:
      'List bilateral negotiations the authenticated user is involved in, either as the source (initiator) or candidate (responder). ' +
      'Negotiations are turn-based exchanges where two AI agents negotiate on behalf of their users to determine if there is a ' +
      'mutual opportunity for collaboration.\n\n' +
      '**Statuses:**\n' +
      '- `active` — Negotiation is in progress, agents are exchanging turns.\n' +
      '- `waiting_for_external` — The graph has yielded and is waiting for an external response (e.g. from the user via respond_to_negotiation) or a timeout.\n' +
      '- `completed` — Negotiation has concluded (accepted, rejected, or reached turn cap).\n\n' +
      '**When to use:** To see ongoing and past negotiations, check which negotiations need attention, ' +
      'or find a negotiation ID for get_negotiation or respond_to_negotiation.',
    querySchema: z.object({
      status: z.enum(['active', 'waiting_for_external', 'completed', 'all']).optional()
        .describe('Filter by negotiation status. Omit or use "all" to return all negotiations.'),
    }),
    handler: async ({ context, query }) => {
      try {
        // Map tool status filter to task state query
        const stateFilter = query.status && query.status !== 'all' ? query.status : undefined;
        // For 'active', query 'working' state tasks
        const dbState = stateFilter === 'active' ? 'working'
          : stateFilter === 'waiting_for_external' ? 'waiting_for_external'
          : stateFilter === 'completed' ? 'completed'
          : undefined;

        const tasks = await negotiationDatabase.getTasksForUser(context.userId, dbState ? { state: dbState } : undefined);

        const negotiations = await Promise.all(tasks.map(async (task) => {
          const meta = task.metadata as { sourceUserId?: string; candidateUserId?: string; type?: string } | null;
          if (meta?.type !== 'negotiation') return null;

          const isSource = meta.sourceUserId === context.userId;
          const counterpartyId = isSource ? meta.candidateUserId : meta.sourceUserId;

          // Get latest message for preview
          const messages = await negotiationDatabase.getMessagesForConversation(task.conversationId);
          const lastMessage = messages[messages.length - 1];
          const lastTurnData = lastMessage
            ? ((lastMessage.parts as Array<{ kind?: string; data?: unknown }>)?.find(p => p.kind === 'data')?.data as { action?: string; assessment?: { reasoning?: string } } | undefined)
            : undefined;

          // Determine whose turn it is based on message count (alternating source/candidate)
          const turnCount = messages.length;
          const currentSpeaker = turnCount % 2 === 0 ? 'source' : 'candidate';
          const isUsersTurn = (isSource && currentSpeaker === 'source') || (!isSource && currentSpeaker === 'candidate');

          // Map task state to tool status
          const status = task.state === 'working' ? 'active'
            : task.state === 'waiting_for_external' ? 'waiting_for_external'
            : task.state === 'completed' ? 'completed'
            : task.state;

          return {
            id: task.id,
            counterpartyId: counterpartyId ?? 'unknown',
            role: isSource ? 'source' : 'candidate',
            turnCount,
            status,
            isUsersTurn,
            latestAction: lastTurnData?.action ?? null,
            latestMessagePreview: lastTurnData?.assessment?.reasoning
              ? lastTurnData.assessment.reasoning.substring(0, 150) + (lastTurnData.assessment.reasoning.length > 150 ? '...' : '')
              : null,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          };
        }));

        const filtered = negotiations.filter(Boolean);

        return success({
          count: filtered.length,
          negotiations: filtered,
        });
      } catch (err) {
        return error(`Failed to list negotiations: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const get_negotiation = defineTool({
    name: 'get_negotiation',
    description:
      'Get the full details of a specific negotiation, including all turns, messages, counterparty info, and current state. ' +
      'Negotiations are bilateral exchanges where two AI agents negotiate on behalf of users. Each turn contains an action ' +
      '(propose, accept, reject, counter) and an assessment with a fit score, reasoning, and suggested roles.\n\n' +
      '**Access control:** You must be a party to the negotiation (source or candidate) to view it.\n\n' +
      '**When to use:** To review the full negotiation history before responding, to understand why a negotiation was ' +
      'accepted or rejected, or to see the current state of an active negotiation.',
    querySchema: z.object({
      negotiationId: z.string().describe('The negotiation task ID (from list_negotiations results).'),
    }),
    handler: async ({ context, query }) => {
      try {
        const task = await negotiationDatabase.getTask(query.negotiationId);
        if (!task) {
          return error('Negotiation not found.');
        }

        const meta = task.metadata as { sourceUserId?: string; candidateUserId?: string; type?: string } | null;
        if (meta?.type !== 'negotiation') {
          return error('Negotiation not found.');
        }

        // Access control: user must be source or candidate
        const isSource = meta.sourceUserId === context.userId;
        const isCandidate = meta.candidateUserId === context.userId;
        if (!isSource && !isCandidate) {
          return error('Access denied: you are not a party to this negotiation.');
        }

        const counterpartyId = isSource ? meta.candidateUserId : meta.sourceUserId;

        // Load messages and artifacts
        const [messages, artifacts] = await Promise.all([
          negotiationDatabase.getMessagesForConversation(task.conversationId),
          negotiationDatabase.getArtifactsForTask(task.id),
        ]);

        // Parse turns from messages
        const turns = messages.map((m, idx) => {
          const dataPart = (m.parts as Array<{ kind?: string; data?: unknown }>)?.find(p => p.kind === 'data');
          const turnData = dataPart?.data as {
            action?: string;
            assessment?: { fitScore?: number; reasoning?: string; suggestedRoles?: unknown };
          } | undefined;

          const turnNumber = idx + 1;
          const speaker = turnNumber % 2 === 1 ? 'source' : 'candidate';

          return {
            turnNumber,
            speaker,
            senderId: m.senderId,
            action: turnData?.action ?? 'unknown',
            fitScore: turnData?.assessment?.fitScore ?? null,
            reasoning: turnData?.assessment?.reasoning ?? null,
            suggestedRoles: turnData?.assessment?.suggestedRoles ?? null,
            createdAt: m.createdAt,
          };
        });

        // Extract outcome from artifacts if completed
        const outcomeArtifact = artifacts.find(a => a.name === 'negotiation-outcome');
        const outcome = outcomeArtifact
          ? (outcomeArtifact.parts as Array<{ kind?: string; data?: unknown }>)?.find(p => p.kind === 'data')?.data
          : null;

        // Determine whose turn it is
        const turnCount = messages.length;
        const currentSpeaker = turnCount % 2 === 0 ? 'source' : 'candidate';
        const isUsersTurn = (isSource && currentSpeaker === 'source') || (!isSource && currentSpeaker === 'candidate');

        const status = task.state === 'working' ? 'active'
          : task.state === 'waiting_for_external' ? 'waiting_for_external'
          : task.state === 'completed' ? 'completed'
          : task.state;

        return success({
          id: task.id,
          conversationId: task.conversationId,
          status,
          role: isSource ? 'source' : 'candidate',
          counterpartyId: counterpartyId ?? 'unknown',
          turnCount,
          isUsersTurn,
          turns,
          outcome,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        });
      } catch (err) {
        return error(`Failed to get negotiation: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const respond_to_negotiation = defineTool({
    name: 'respond_to_negotiation',
    description:
      'Respond to a negotiation that is waiting for external input. This tool allows users to influence the negotiation ' +
      'by accepting, rejecting, or countering the current proposal.\n\n' +
      '**Turn-based model:** Negotiations alternate between source and candidate agents. When the graph yields with ' +
      '`waiting_for_external` status, the user whose turn it is can respond.\n\n' +
      '**Valid actions:**\n' +
      '- `accept` — Accept the current proposal. The negotiation will be finalized as an opportunity.\n' +
      '- `reject` — Reject the current proposal. The negotiation will end without creating an opportunity.\n' +
      '- `counter` — Counter the proposal with a message (message is required for counter). The negotiation will continue.\n\n' +
      '**What happens after:** For now, this tool only persists the response as a turn message. Phase 4 will handle resuming ' +
      'the negotiation graph to process the response.',
    querySchema: z.object({
      negotiationId: z.string().describe('The negotiation task ID to respond to.'),
      action: z.enum(['accept', 'reject', 'counter']).describe('The response action: accept the proposal, reject it, or counter with a new message.'),
      message: z.string().optional().describe('Required for "counter" action. Your counter-proposal message explaining what you want to change.'),
    }),
    handler: async ({ context, query }) => {
      try {
        const task = await negotiationDatabase.getTask(query.negotiationId);
        if (!task) {
          return error('Negotiation not found.');
        }

        const meta = task.metadata as { sourceUserId?: string; candidateUserId?: string; type?: string } | null;
        if (meta?.type !== 'negotiation') {
          return error('Negotiation not found.');
        }

        // Validate negotiation is waiting for external input
        if (task.state !== 'waiting_for_external') {
          return error(`Negotiation is not waiting for a response. Current status: ${task.state}`);
        }

        // Access control: user must be a party
        const isSource = meta.sourceUserId === context.userId;
        const isCandidate = meta.candidateUserId === context.userId;
        if (!isSource && !isCandidate) {
          return error('Access denied: you are not a party to this negotiation.');
        }

        // Determine whose turn it is
        const messages = await negotiationDatabase.getMessagesForConversation(task.conversationId);
        const turnCount = messages.length;
        const currentSpeaker = turnCount % 2 === 0 ? 'source' : 'candidate';
        const isUsersTurn = (isSource && currentSpeaker === 'source') || (!isSource && currentSpeaker === 'candidate');

        if (!isUsersTurn) {
          return error('It is not your turn to respond in this negotiation.');
        }

        // Validate counter has a message
        if (query.action === 'counter' && !query.message?.trim()) {
          return error('A message is required when countering a proposal. Explain what you want to change.');
        }

        // Persist the response as a turn message
        const senderId = `agent:${context.userId}`;
        const parts = [{
          kind: 'data' as const,
          data: {
            action: query.action,
            assessment: {
              fitScore: query.action === 'accept' ? 100 : query.action === 'reject' ? 0 : 50,
              reasoning: query.message ?? `User ${query.action}ed the proposal.`,
              suggestedRoles: { ownUser: 'peer', otherUser: 'peer' },
            },
          },
        }];

        await negotiationDatabase.createMessage({
          conversationId: task.conversationId,
          senderId,
          role: 'agent',
          parts,
          taskId: task.id,
        });

        return success({
          message: `Response recorded: ${query.action}. ${
            query.action === 'counter'
              ? 'Your counter-proposal has been submitted. The negotiation will resume when Phase 4 graph resumption is implemented.'
              : query.action === 'accept'
                ? 'The negotiation has been accepted. An opportunity will be created when Phase 4 graph resumption is implemented.'
                : 'The negotiation has been rejected.'
          }`,
          negotiationId: task.id,
          action: query.action,
          turnNumber: turnCount + 1,
        });
      } catch (err) {
        return error(`Failed to respond to negotiation: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  return [list_negotiations, get_negotiation, respond_to_negotiation] as const;
}
