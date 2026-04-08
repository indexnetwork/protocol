import { z } from 'zod';

import type { DefineTool, ToolDeps } from '../shared/agent/tool.helpers.js';
import { success, error } from '../shared/agent/tool.helpers.js';
import { NegotiationProposer } from './negotiation.proposer.js';
import { NegotiationResponder } from './negotiation.responder.js';
import type { NegotiationTurn, UserNegotiationContext, SeedAssessment, NegotiationOutcome } from './negotiation.state.js';
import { protocolLogger } from '../shared/observability/protocol.logger.js';

const logger = protocolLogger('NegotiationTools');

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
      '**What happens after:** Accept/reject finalizes the negotiation immediately. Counter continues the negotiation — ' +
      'if the counterparty has an external agent, the negotiation yields again; otherwise the AI agent responds inline.',
    querySchema: z.object({
      negotiationId: z.string().describe('The negotiation task ID to respond to.'),
      action: z.enum(['accept', 'reject', 'counter']).describe('The response action: accept the proposal, reject it, or counter with a new message.'),
      message: z.string().optional().describe('Required for "counter" action. Your counter-proposal message explaining what you want to change.'),
      fitScore: z.number().min(0).max(100).optional().describe('Optional fit score (0-100) for your assessment. Defaults to 100 for accept, 0 for reject, 50 for counter.'),
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

        // ── Cancel pending timeout ──
        if (deps.negotiationTimeoutQueue) {
          await deps.negotiationTimeoutQueue.cancelTimeout(task.id);
        }

        // ── Build and persist the external agent's turn ──
        const defaultFitScore = query.action === 'accept' ? 100 : query.action === 'reject' ? 0 : 50;
        const turnData: NegotiationTurn = {
          action: query.action,
          assessment: {
            fitScore: query.fitScore ?? defaultFitScore,
            reasoning: query.message ?? `User ${query.action}ed the proposal.`,
            suggestedRoles: { ownUser: 'peer', otherUser: 'peer' },
          },
        };

        const senderId = `agent:${context.userId}`;
        const turnMessage = await negotiationDatabase.createMessage({
          conversationId: task.conversationId,
          senderId,
          role: 'agent',
          parts: [{ kind: 'data' as const, data: turnData }],
          taskId: task.id,
        });

        const newTurnCount = turnCount + 1;

        // ── Handle accept/reject: finalize immediately ──
        if (query.action === 'accept' || query.action === 'reject') {
          const allMessages = [...messages, { id: turnMessage.id, senderId: turnMessage.senderId, role: turnMessage.role, parts: turnMessage.parts as unknown[], createdAt: turnMessage.createdAt }];
          const history: NegotiationTurn[] = allMessages.map(m => {
            const dp = (m.parts as Array<{ kind?: string; data?: unknown }>)?.find(p => p.kind === 'data');
            return dp?.data as NegotiationTurn;
          }).filter(Boolean);

          const nextSpeaker = currentSpeaker === 'source' ? 'candidate' : 'source';
          const outcome = buildNegotiationOutcome(history, newTurnCount, query.action, meta.sourceUserId!, meta.candidateUserId!, nextSpeaker);

          await negotiationDatabase.updateTaskState(task.id, 'completed');
          await negotiationDatabase.createArtifact({
            taskId: task.id,
            name: 'negotiation-outcome',
            parts: [{ kind: 'data', data: outcome }],
            metadata: { hasOpportunity: outcome.hasOpportunity, turnCount: newTurnCount },
          });

          // Emit completed event for both parties
          if (deps.negotiationEvents) {
            const outcomeStr = query.action === 'accept' ? 'accepted' : 'rejected';
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.sourceUserId!,
              outcome: outcomeStr,
              finalScore: outcome.finalScore,
              turnCount: newTurnCount,
            });
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.candidateUserId!,
              outcome: outcomeStr,
              finalScore: outcome.finalScore,
              turnCount: newTurnCount,
            });
          }

          return success({
            message: query.action === 'accept'
              ? 'Negotiation accepted. An opportunity has been created.'
              : 'Negotiation rejected.',
            negotiationId: task.id,
            action: query.action,
            turnNumber: newTurnCount,
            outcome,
          });
        }

        // ── Handle counter: check if under max turns ──
        const maxTurns = 6; // Default max turns (matches graph default)
        if (newTurnCount >= maxTurns) {
          // Max turns reached — finalize with turn_cap
          const allMessages = [...messages, { id: turnMessage.id, senderId: turnMessage.senderId, role: turnMessage.role, parts: turnMessage.parts as unknown[], createdAt: turnMessage.createdAt }];
          const history: NegotiationTurn[] = allMessages.map(m => {
            const dp = (m.parts as Array<{ kind?: string; data?: unknown }>)?.find(p => p.kind === 'data');
            return dp?.data as NegotiationTurn;
          }).filter(Boolean);

          const nextSpeakerForCap = currentSpeaker === 'source' ? 'candidate' : 'source';
          const outcome = buildNegotiationOutcome(history, newTurnCount, 'counter', meta.sourceUserId!, meta.candidateUserId!, nextSpeakerForCap);

          await negotiationDatabase.updateTaskState(task.id, 'completed');
          await negotiationDatabase.createArtifact({
            taskId: task.id,
            name: 'negotiation-outcome',
            parts: [{ kind: 'data', data: outcome }],
            metadata: { hasOpportunity: false, turnCount: newTurnCount },
          });

          if (deps.negotiationEvents) {
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.sourceUserId!,
              outcome: 'turn_cap',
              finalScore: 0,
              turnCount: newTurnCount,
            });
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.candidateUserId!,
              outcome: 'turn_cap',
              finalScore: 0,
              turnCount: newTurnCount,
            });
          }

          return success({
            message: 'Maximum turns reached. Negotiation finalized without opportunity.',
            negotiationId: task.id,
            action: 'counter',
            turnNumber: newTurnCount,
            outcome,
          });
        }

        // ── Counter under max turns: determine counterparty's next turn ──
        const counterpartyUserId = isSource ? meta.candidateUserId! : meta.sourceUserId!;
        const counterpartySpeaker = isSource ? 'candidate' : 'source';

        // Check if counterparty has an external agent
        const counterpartyHasWebhook = deps.webhookLookup
          ? await deps.webhookLookup.hasWebhookForEvent(counterpartyUserId, 'negotiation.turn_received')
          : false;

        if (counterpartyHasWebhook) {
          // Yield again for the counterparty's external agent
          await negotiationDatabase.updateTaskState(task.id, 'waiting_for_external');

          const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          if (deps.negotiationEvents) {
            deps.negotiationEvents.emitTurnReceived({
              negotiationId: task.id,
              userId: counterpartyUserId,
              turnNumber: newTurnCount + 1,
              counterpartyAction: 'counter',
              counterpartyMessage: query.message,
              deadline,
            });
          }

          if (deps.negotiationTimeoutQueue) {
            await deps.negotiationTimeoutQueue.enqueueTimeout(task.id, newTurnCount, 24 * 60 * 60 * 1000);
          }

          return success({
            message: 'Counter-proposal submitted. Waiting for counterparty response.',
            negotiationId: task.id,
            action: 'counter',
            turnNumber: newTurnCount,
            waitingForExternal: true,
          });
        }

        // ── No external agent for counterparty: run AI agent inline ──
        await negotiationDatabase.updateTaskState(task.id, 'working');

        const allMessages = [...messages, { id: turnMessage.id, senderId: turnMessage.senderId, role: turnMessage.role, parts: turnMessage.parts as unknown[], createdAt: turnMessage.createdAt }];
        const history: NegotiationTurn[] = allMessages.map(m => {
          const dp = (m.parts as Array<{ kind?: string; data?: unknown }>)?.find(p => p.kind === 'data');
          return dp?.data as NegotiationTurn;
        }).filter(Boolean);

        // Build user contexts from task metadata for AI agent invocation
        // Note: we use minimal context here since we don't have full user profiles in the tool.
        // The AI agent will work with the history which contains all the reasoning.
        const counterpartyIsSource = counterpartySpeaker === 'source';
        const agent = counterpartyIsSource ? new NegotiationProposer() : new NegotiationResponder();

        const ownUserCtx: UserNegotiationContext = { id: counterpartyUserId, intents: [], profile: {} };
        const otherUserCtx: UserNegotiationContext = { id: context.userId, intents: [], profile: {} };
        const seedAssessment: SeedAssessment = { score: 50, reasoning: 'Continued negotiation', valencyRole: 'peer' };

        const aiTurn = await agent.invoke({
          ownUser: ownUserCtx,
          otherUser: otherUserCtx,
          indexContext: { networkId: '', prompt: '' },
          seedAssessment,
          history,
        });

        // Persist AI turn
        const aiSenderId = `agent:${counterpartyUserId}`;
        await negotiationDatabase.createMessage({
          conversationId: task.conversationId,
          senderId: aiSenderId,
          role: 'agent',
          parts: [{ kind: 'data' as const, data: aiTurn }],
          taskId: task.id,
        });

        const finalTurnCount = newTurnCount + 1;

        // Evaluate AI response
        if (aiTurn.action === 'accept' || aiTurn.action === 'reject') {
          const fullHistory = [...history, aiTurn];
          const outcome = buildNegotiationOutcome(fullHistory, finalTurnCount, aiTurn.action, meta.sourceUserId!, meta.candidateUserId!, counterpartySpeaker === 'source' ? 'candidate' : 'source');

          await negotiationDatabase.updateTaskState(task.id, 'completed');
          await negotiationDatabase.createArtifact({
            taskId: task.id,
            name: 'negotiation-outcome',
            parts: [{ kind: 'data', data: outcome }],
            metadata: { hasOpportunity: outcome.hasOpportunity, turnCount: finalTurnCount },
          });

          if (deps.negotiationEvents) {
            const outcomeStr = aiTurn.action === 'accept' ? 'accepted' : 'rejected';
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.sourceUserId!,
              outcome: outcomeStr,
              finalScore: outcome.finalScore,
              turnCount: finalTurnCount,
            });
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.candidateUserId!,
              outcome: outcomeStr,
              finalScore: outcome.finalScore,
              turnCount: finalTurnCount,
            });
          }

          return success({
            message: `Counter submitted. AI agent responded with ${aiTurn.action}.`,
            negotiationId: task.id,
            action: query.action,
            turnNumber: newTurnCount,
            aiResponse: { action: aiTurn.action, fitScore: aiTurn.assessment.fitScore, reasoning: aiTurn.assessment.reasoning },
            outcome,
          });
        }

        // AI countered — check if max turns reached
        if (finalTurnCount >= maxTurns) {
          const fullHistory = [...history, aiTurn];
          const outcome = buildNegotiationOutcome(fullHistory, finalTurnCount, 'counter', meta.sourceUserId!, meta.candidateUserId!, counterpartySpeaker === 'source' ? 'candidate' : 'source');

          await negotiationDatabase.updateTaskState(task.id, 'completed');
          await negotiationDatabase.createArtifact({
            taskId: task.id,
            name: 'negotiation-outcome',
            parts: [{ kind: 'data', data: outcome }],
            metadata: { hasOpportunity: false, turnCount: finalTurnCount },
          });

          if (deps.negotiationEvents) {
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.sourceUserId!,
              outcome: 'turn_cap',
              finalScore: 0,
              turnCount: finalTurnCount,
            });
            deps.negotiationEvents.emitCompleted({
              negotiationId: task.id,
              userId: meta.candidateUserId!,
              outcome: 'turn_cap',
              finalScore: 0,
              turnCount: finalTurnCount,
            });
          }

          return success({
            message: 'AI agent countered but max turns reached. Negotiation finalized.',
            negotiationId: task.id,
            action: query.action,
            turnNumber: newTurnCount,
            aiResponse: { action: aiTurn.action, fitScore: aiTurn.assessment.fitScore, reasoning: aiTurn.assessment.reasoning },
            outcome,
          });
        }

        // AI countered, user's turn again — check if user has webhook to yield
        const userHasWebhook = deps.webhookLookup
          ? await deps.webhookLookup.hasWebhookForEvent(context.userId, 'negotiation.turn_received')
          : false;

        if (userHasWebhook) {
          await negotiationDatabase.updateTaskState(task.id, 'waiting_for_external');

          const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          if (deps.negotiationEvents) {
            deps.negotiationEvents.emitTurnReceived({
              negotiationId: task.id,
              userId: context.userId,
              turnNumber: finalTurnCount + 1,
              counterpartyAction: aiTurn.action,
              counterpartyMessage: aiTurn.assessment.reasoning,
              deadline,
            });
          }

          if (deps.negotiationTimeoutQueue) {
            await deps.negotiationTimeoutQueue.enqueueTimeout(task.id, finalTurnCount, 24 * 60 * 60 * 1000);
          }

          return success({
            message: 'Counter submitted. AI agent countered back. Waiting for your next response.',
            negotiationId: task.id,
            action: query.action,
            turnNumber: newTurnCount,
            aiResponse: { action: aiTurn.action, fitScore: aiTurn.assessment.fitScore, reasoning: aiTurn.assessment.reasoning },
            waitingForExternal: true,
          });
        }

        // No webhook for user either — set back to working so graph can continue
        await negotiationDatabase.updateTaskState(task.id, 'working');

        return success({
          message: 'Counter submitted. AI agent countered back. Negotiation continues.',
          negotiationId: task.id,
          action: query.action,
          turnNumber: newTurnCount,
          aiResponse: { action: aiTurn.action, fitScore: aiTurn.assessment.fitScore, reasoning: aiTurn.assessment.reasoning },
        });
      } catch (err) {
        return error(`Failed to respond to negotiation: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  return [list_negotiations, get_negotiation, respond_to_negotiation] as const;
}

/**
 * Build a NegotiationOutcome from the full turn history.
 * Mirrors the logic in the graph's finalizeNode for consistency.
 *
 * @param history - All negotiation turns
 * @param turnCount - Total number of turns
 * @param lastAction - The last turn's action (accept/reject/counter)
 * @param sourceUserId - Source user ID
 * @param candidateUserId - Candidate user ID
 * @param currentSpeaker - Who would speak next (the person after the accepter/rejector)
 */
function buildNegotiationOutcome(
  history: NegotiationTurn[],
  turnCount: number,
  lastAction: string,
  sourceUserId: string,
  candidateUserId: string,
  currentSpeaker: string,
): NegotiationOutcome {
  const hasOpportunity = lastAction === 'accept';
  const atCap = lastAction === 'counter';

  const scores = history.map(t => t.assessment.fitScore);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  let agreedRoles: NegotiationOutcome['agreedRoles'] = [];
  if (hasOpportunity && history.length >= 2) {
    const acceptTurn = history[history.length - 1];
    const precedingTurn = history[history.length - 2];
    const accepterIsSource = currentSpeaker === 'candidate';
    const [sourceRole, candidateRole] = accepterIsSource
      ? [acceptTurn.assessment.suggestedRoles.ownUser, precedingTurn.assessment.suggestedRoles.ownUser]
      : [precedingTurn.assessment.suggestedRoles.ownUser, acceptTurn.assessment.suggestedRoles.ownUser];
    agreedRoles = [
      { userId: sourceUserId, role: sourceRole },
      { userId: candidateUserId, role: candidateRole },
    ];
  }

  return {
    hasOpportunity,
    finalScore: hasOpportunity ? avgScore : 0,
    agreedRoles,
    reasoning: history[history.length - 1]?.assessment.reasoning ?? '',
    turnCount,
    ...(atCap && { reason: 'turn_cap' }),
  };
}
