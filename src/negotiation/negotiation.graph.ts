import { StateGraph } from "@langchain/langgraph";

import { requestContext, type TraceEmitter } from "../shared/observability/request-context.js";
import type { NegotiationDatabase } from "../shared/interfaces/database.interface.js";
import type { WebhookLookup, NegotiationEventEmitter, NegotiationTimeoutQueue } from "../shared/interfaces/negotiation-events.interface.js";
import { NegotiationGraphState, type NegotiationTurn, type NegotiationOutcome, type UserNegotiationContext, type SeedAssessment, type NegotiationGraphLike } from "./negotiation.state.js";
import { protocolLogger } from "../shared/observability/protocol.logger.js";

const logger = protocolLogger("NegotiationGraph");

interface NegotiationAgentLike {
  invoke(input: {
    ownUser: UserNegotiationContext;
    otherUser: UserNegotiationContext;
    indexContext: { networkId: string; prompt: string };
    seedAssessment: SeedAssessment;
    history: NegotiationTurn[];
  }): Promise<NegotiationTurn>;
}

/** Default timeout for external agent responses (24 hours). */
const DEFAULT_EXTERNAL_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Factory for the bilateral negotiation LangGraph state machine.
 * @remarks Accepts dependencies via constructor for testability.
 */
export class NegotiationGraphFactory {
  constructor(
    private database: NegotiationDatabase,
    private proposer: NegotiationAgentLike,
    private responder: NegotiationAgentLike,
    private webhookLookup?: WebhookLookup,
    private eventEmitter?: NegotiationEventEmitter,
    private timeoutQueue?: NegotiationTimeoutQueue,
  ) {}

  createGraph() {
    const { database, proposer, responder, webhookLookup, eventEmitter, timeoutQueue } = this;

    const initNode = async (state: typeof NegotiationGraphState.State) => {
      try {
        const conversation = await database.createConversation([
          { participantId: `agent:${state.sourceUser.id}`, participantType: "agent" },
          { participantId: `agent:${state.candidateUser.id}`, participantType: "agent" },
        ]);

        const task = await database.createTask(conversation.id, {
          type: "negotiation",
          sourceUserId: state.sourceUser.id,
          candidateUserId: state.candidateUser.id,
        });

        return {
          conversationId: conversation.id,
          taskId: task.id,
          currentSpeaker: "source" as const,
          turnCount: 0,
        };
      } catch (err) {
        return { error: `Init failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    };

    const turnNode = async (state: typeof NegotiationGraphState.State) => {
      try {
        const history: NegotiationTurn[] = state.messages.map((m) => {
          const dataPart = (m.parts as Array<{ kind?: string; data?: unknown }>).find((p) => p.kind === "data");
          return dataPart?.data as NegotiationTurn;
        }).filter(Boolean);

        const isSource = state.currentSpeaker === "source";
        const ownUser = isSource ? state.sourceUser : state.candidateUser;
        const otherUser = isSource ? state.candidateUser : state.sourceUser;

        // ── Yield check: if the active party has an external agent (webhook), pause ──
        // Skip when yieldForExternal is false (e.g. chat-initiated negotiations need real-time results).
        if (webhookLookup && state.yieldForExternal !== false) {
          const hasExternalAgent = await webhookLookup.hasWebhookForEvent(ownUser.id, 'negotiation.turn_received');
          if (hasExternalAgent) {
            logger.info("[Graph:Turn] External agent available, yielding", { userId: ownUser.id, turnCount: state.turnCount });

            await database.updateTaskState(state.taskId, "waiting_for_external");

            // Determine the last counterparty action for the event payload
            const lastTurnData = history[history.length - 1];
            const deadline = new Date(Date.now() + DEFAULT_EXTERNAL_TIMEOUT_MS).toISOString();

            eventEmitter?.emitTurnReceived({
              negotiationId: state.taskId,
              userId: ownUser.id,
              turnNumber: state.turnCount + 1,
              counterpartyAction: lastTurnData?.action ?? 'propose',
              counterpartyMessage: lastTurnData?.assessment?.reasoning,
              deadline,
            });

            // Enqueue timeout fallback (fire-and-forget to avoid blocking if Redis is down)
            if (timeoutQueue) {
              timeoutQueue.enqueueTimeout(state.taskId, state.turnCount, DEFAULT_EXTERNAL_TIMEOUT_MS)
                .catch((err) => logger.error("[Graph:Turn] Failed to enqueue timeout", { taskId: state.taskId, error: err instanceof Error ? err.message : String(err) }));
            }

            // Return early — graph yields. No new message, no turn increment.
            return { status: 'waiting_for_external' as const };
          }
        }

        // ── No external agent: run the built-in AI agent ──
        const agent = isSource ? proposer : responder;
        const senderId = `agent:${ownUser.id}`;

        const traceEmitter = requestContext.getStore()?.traceEmitter;
        const agentName = isSource ? "Negotiation proposer agent" : "Negotiation responder agent";
        const agentStart = Date.now();
        traceEmitter?.({ type: "agent_start", name: agentName });

        const turn = await agent.invoke({
          ownUser,
          otherUser,
          indexContext: state.indexContext,
          seedAssessment: state.seedAssessment,
          history,
        });

        traceEmitter?.({ type: "agent_end", name: agentName, durationMs: Date.now() - agentStart, summary: `${turn.action}:${turn.assessment.fitScore}` });

        // First turn must be "propose"
        if (state.turnCount === 0 && turn.action !== "propose") {
          logger.warn("[Graph:Turn] Proposer returned unexpected action on turn 0, forcing to propose", { action: turn.action });
          turn.action = "propose";
        }

        const parts = [{ kind: "data" as const, data: turn }];
        const message = await database.createMessage({
          conversationId: state.conversationId,
          senderId,
          role: "agent",
          parts,
          taskId: state.taskId,
        });

        await database.updateTaskState(state.taskId, "working");

        return {
          messages: [{
            id: message.id,
            senderId: message.senderId,
            role: "agent" as const,
            parts: message.parts,
            createdAt: message.createdAt,
          }],
          turnCount: state.turnCount + 1,
          currentSpeaker: (isSource ? "candidate" : "source") as "source" | "candidate",
          lastTurn: turn,
        };
      } catch (err) {
        return {
          lastTurn: {
            action: "reject" as const,
            assessment: { fitScore: 0, reasoning: `Agent error: ${err instanceof Error ? err.message : String(err)}`, suggestedRoles: { ownUser: "peer" as const, otherUser: "peer" as const } },
          },
          turnCount: state.turnCount + 1,
          error: `Turn failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    };

    const evaluateNode = (state: typeof NegotiationGraphState.State): string => {
      // When the graph yielded for an external agent, go straight to finalize (no-op exit)
      if (state.status === 'waiting_for_external') return "finalize";
      if (state.error) return "finalize";
      if (!state.lastTurn) return "finalize";
      if (state.lastTurn.action === "accept") return "finalize";
      if (state.lastTurn.action === "reject") return "finalize";
      if (state.turnCount >= state.maxTurns) return "finalize";
      return "turn";
    };

    const finalizeNode = async (state: typeof NegotiationGraphState.State) => {
      // When yielding for an external agent, skip outcome persistence — the graph
      // will be resumed via respond_to_negotiation or the timeout worker.
      if (state.status === 'waiting_for_external') {
        return {};
      }

      const history: NegotiationTurn[] = state.messages.map((m) => {
        const dataPart = (m.parts as Array<{ kind?: string; data?: unknown }>).find((p) => p.kind === "data");
        return dataPart?.data as NegotiationTurn;
      }).filter(Boolean);

      const lastTurn = state.lastTurn;
      const hasOpportunity = lastTurn?.action === "accept";
      const atCap = state.turnCount >= state.maxTurns && lastTurn?.action === "counter";

      const scores = history.map((t) => t.assessment.fitScore);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      let agreedRoles: NegotiationOutcome["agreedRoles"] = [];
      if (hasOpportunity && history.length >= 2) {
        // The accept turn is always last; the preceding turn is from the other side.
        // Use currentSpeaker (who would speak NEXT) to determine who spoke last.
        const acceptTurn = history[history.length - 1];
        const precedingTurn = history[history.length - 2];
        // currentSpeaker flips after each turn; after the accept turn it points to who would go next.
        // The accepter is the one who just spoke (opposite of currentSpeaker).
        const accepterIsSource = state.currentSpeaker === "candidate";
        const [sourceRole, candidateRole] = accepterIsSource
          ? [acceptTurn.assessment.suggestedRoles.ownUser, precedingTurn.assessment.suggestedRoles.ownUser]
          : [precedingTurn.assessment.suggestedRoles.ownUser, acceptTurn.assessment.suggestedRoles.ownUser];
        agreedRoles = [
          { userId: state.sourceUser.id, role: sourceRole },
          { userId: state.candidateUser.id, role: candidateRole },
        ];
      }

      const outcome: NegotiationOutcome = {
        hasOpportunity,
        finalScore: hasOpportunity ? avgScore : 0,
        agreedRoles,
        reasoning: lastTurn?.assessment.reasoning ?? "",
        turnCount: state.turnCount,
        ...(atCap && { reason: "turn_cap" }),
      };

      try {
        await database.updateTaskState(state.taskId, "completed");
        await database.createArtifact({
          taskId: state.taskId,
          name: "negotiation-outcome",
          parts: [{ kind: "data", data: outcome }],
          metadata: { hasOpportunity, turnCount: state.turnCount },
        });
      } catch (err) {
        logger.error("[Graph:Finalize] Failed to persist outcome", { error: err });
      }

      return { outcome, status: 'completed' as const };
    };

    const workflow = new StateGraph(NegotiationGraphState)
      .addNode("init", initNode)
      .addNode("turn", turnNode)
      .addNode("finalize", finalizeNode)
      .addConditionalEdges("turn", evaluateNode, {
        turn: "turn",
        finalize: "finalize",
      })
      .addConditionalEdges("init", (state: typeof NegotiationGraphState.State) => {
        return state.error ? "finalize" : "turn";
      }, { turn: "turn", finalize: "finalize" })
      .addEdge("__start__", "init")
      .addEdge("finalize", "__end__");

    return workflow.compile();
  }
}

export interface NegotiationCandidate {
  userId: string;
  score: number;
  reasoning: string;
  valencyRole: string;
  networkId?: string;
  candidateUser: UserNegotiationContext;
}

export interface NegotiationResult {
  userId: string;
  negotiationScore: number;
  agreedRoles: NegotiationOutcome["agreedRoles"];
  reasoning: string;
  turnCount: number;
}

/**
 * Runs bilateral negotiation for each candidate in parallel.
 * @param negotiationGraph - Compiled negotiation graph
 * @param sourceUser - Source user context
 * @param candidates - Evaluated candidates to negotiate with
 * @param indexContext - Index context for the negotiation
 * @param opts - Optional maxTurns and traceEmitter
 * @returns Only candidates that produced an opportunity
 */
export async function negotiateCandidates(
  negotiationGraph: NegotiationGraphLike,
  sourceUser: UserNegotiationContext,
  candidates: NegotiationCandidate[],
  indexContext: { networkId: string; prompt: string },
  opts?: { maxTurns?: number; traceEmitter?: TraceEmitter; indexContextOverrides?: Map<string, string>; yieldForExternal?: boolean },
): Promise<NegotiationResult[]> {
  const { maxTurns, traceEmitter, indexContextOverrides, yieldForExternal } = opts ?? {};

  const results = await Promise.all(
    candidates.map(async (candidate) => {
      const start = Date.now();
      traceEmitter?.({ type: "agent_start", name: "Negotiating candidate" });

      try {
        // Use per-candidate index context; never fall back to a different index's prompt
        const candidateIndexContext = candidate.networkId
          ? { networkId: candidate.networkId, prompt: indexContextOverrides?.get(candidate.networkId) ?? '' }
          : indexContext;

        const result = await negotiationGraph.invoke({
          sourceUser,
          candidateUser: candidate.candidateUser,
          indexContext: candidateIndexContext,
          seedAssessment: {
            score: candidate.score,
            reasoning: candidate.reasoning,
            valencyRole: candidate.valencyRole,
          },
          ...(maxTurns !== undefined && { maxTurns }),
          ...(yieldForExternal !== undefined && { yieldForExternal }),
        });

        const durationMs = Date.now() - start;
        const outcome = result.outcome;
        const hasOpportunity = outcome?.hasOpportunity === true;

        // Build inline turn flow: "propose:85 → counter:70 → accept:78"
        const turnFlow = (result.messages ?? [])
          .map((m) => {
            const dataPart = (m.parts as Array<{ kind?: string; data?: Record<string, unknown> }>)?.find((p) => p.kind === "data");
            if (!dataPart?.data) return null;
            const turn = dataPart.data as { action?: string; assessment?: { fitScore?: number } };
            return `${turn.action ?? "unknown"}:${turn.assessment?.fitScore ?? "?"}`;
          })
          .filter(Boolean)
          .join(" → ");

        const statusTag = hasOpportunity ? "✓ opportunity" : "✗ rejected";
        traceEmitter?.({ type: "agent_end", name: "Negotiating candidate", durationMs, summary: `${candidate.userId}: ${turnFlow} ${statusTag}` });

        if (hasOpportunity && outcome) {
          return {
            userId: candidate.userId,
            negotiationScore: outcome.finalScore,
            agreedRoles: outcome.agreedRoles,
            reasoning: outcome.reasoning,
            turnCount: outcome.turnCount,
          };
        }
        return null;
      } catch (err) {
        const durationMs = Date.now() - start;
        traceEmitter?.({ type: "agent_end", name: "Negotiating candidate", durationMs, summary: `${candidate.userId}: error` });
        logger.error("[negotiateCandidates] Negotiation failed", { candidateUserId: candidate.userId, error: err });
        return null;
      }
    }),
  );

  return results.filter((r): r is NegotiationResult => r !== null);
}

/**
 * Creates a negotiation graph with the provided dependencies.
 * @param deps.database - Conversation database adapter
 * @param deps.proposer - Agent that proposes negotiation terms
 * @param deps.responder - Agent that responds to negotiation proposals
 */
export function createDefaultNegotiationGraph(deps: {
  database: NegotiationDatabase;
  proposer: NegotiationAgentLike;
  responder: NegotiationAgentLike;
  webhookLookup?: WebhookLookup;
  eventEmitter?: NegotiationEventEmitter;
  timeoutQueue?: NegotiationTimeoutQueue;
}) {
  const factory = new NegotiationGraphFactory(
    deps.database,
    deps.proposer,
    deps.responder,
    deps.webhookLookup,
    deps.eventEmitter,
    deps.timeoutQueue,
  );
  return factory.createGraph();
}
