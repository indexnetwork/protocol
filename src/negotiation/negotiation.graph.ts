import { StateGraph } from "@langchain/langgraph";

import { requestContext, type TraceEmitter } from "../shared/observability/request-context.js";
import type { NegotiationDatabase } from "../shared/interfaces/database.interface.js";
import type { NegotiationTimeoutQueue } from "../shared/interfaces/negotiation-events.interface.js";
import type { AgentDispatcher, NegotiationTurnPayload } from "../shared/interfaces/agent-dispatcher.interface.js";
import { NegotiationGraphState, type NegotiationTurn, type NegotiationOutcome, type UserNegotiationContext, type SeedAssessment, type NegotiationGraphLike } from "./negotiation.state.js";
import { IndexNegotiator } from "./negotiation.agent.js";
import { protocolLogger } from "../shared/observability/protocol.logger.js";

const logger = protocolLogger("NegotiationGraph");

/**
 * Factory for the bilateral negotiation LangGraph state machine.
 * @remarks Accepts an AgentDispatcher for per-turn agent resolution.
 */
export class NegotiationGraphFactory {
  constructor(
    private database: NegotiationDatabase,
    private dispatcher: AgentDispatcher,
    private timeoutQueue?: NegotiationTimeoutQueue,
  ) {}

  createGraph() {
    const { database, dispatcher, timeoutQueue } = this;
    const systemAgent = new IndexNegotiator();

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
          ...(state.opportunityId && { opportunityId: state.opportunityId }),
        });

        // Determine scenario-based maxTurns
        const scope = { action: 'manage:negotiations', scopeType: 'network', scopeId: state.indexContext.networkId };
        const [sourceHasAgent, candidateHasAgent] = await Promise.all([
          dispatcher.hasPersonalAgent(state.sourceUser.id, scope),
          dispatcher.hasPersonalAgent(state.candidateUser.id, scope),
        ]);

        let maxTurns = state.maxTurns;
        if (maxTurns === 6) {
          // Only override if using the default — explicit caller overrides take precedence
          if (sourceHasAgent && candidateHasAgent) {
            maxTurns = 0; // unlimited — 24h timeout is the safety valve
          } else if (sourceHasAgent || candidateHasAgent) {
            maxTurns = 8;
          }
          // else both system: keep 6
        }

        return {
          conversationId: conversation.id,
          taskId: task.id,
          currentSpeaker: "source" as const,
          turnCount: 0,
          maxTurns,
        };
      } catch (err) {
        return { error: `Init failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    };

    const turnNode = async (state: typeof NegotiationGraphState.State) => {
      const traceEmitter = requestContext.getStore()?.traceEmitter;
      const agentName = "Index negotiator";
      const agentStart = Date.now();
      traceEmitter?.({ type: "agent_start", name: agentName });

      try {
        const history: NegotiationTurn[] = state.messages.map((m) => {
          const dataPart = (m.parts as Array<{ kind?: string; data?: unknown }>).find((p) => p.kind === "data");
          return dataPart?.data as NegotiationTurn;
        }).filter(Boolean);

        const isSource = state.currentSpeaker === "source";
        const ownUser = isSource ? state.sourceUser : state.candidateUser;
        const otherUser = isSource ? state.candidateUser : state.sourceUser;

        // Determine if this is the system agent's final allowed turn
        const isFinalTurn = state.maxTurns > 0 && (state.turnCount + 1) >= state.maxTurns;

        const payload: NegotiationTurnPayload = {
          negotiationId: state.taskId,
          ownUser,
          otherUser,
          indexContext: state.indexContext,
          seedAssessment: state.seedAssessment,
          history,
          isFinalTurn,
          isDiscoverer: isSource,
          ...(state.discoveryQuery && { discoveryQuery: state.discoveryQuery }),
        };

        const scope = { action: 'manage:negotiations', scopeType: 'network', scopeId: state.indexContext.networkId };

        const dispatchResult = await dispatcher.dispatch(ownUser.id, scope, payload, { timeoutMs: state.timeoutMs });

        let turn: NegotiationTurn;

        if (dispatchResult.handled) {
          // Personal agent responded
          turn = dispatchResult.turn;
        } else if (dispatchResult.reason === 'waiting') {
          // Long timeout — graph suspends
          traceEmitter?.({ type: "agent_end", name: agentName, durationMs: Date.now() - agentStart, summary: "waiting_for_agent" });
          await database.updateTaskState(state.taskId, "waiting_for_agent");
          return { status: 'waiting_for_agent' as const };
        } else {
          // No personal agent or timeout — run system agent
          turn = await systemAgent.invoke({
            ownUser,
            otherUser,
            indexContext: state.indexContext,
            seedAssessment: state.seedAssessment,
            history,
            isFinalTurn,
            isDiscoverer: isSource,
            ...(state.discoveryQuery && { discoveryQuery: state.discoveryQuery }),
          });
        }

        traceEmitter?.({ type: "agent_end", name: agentName, durationMs: Date.now() - agentStart, summary: `${turn.action}` });

        // First turn must be "propose"
        if (state.turnCount === 0 && turn.action !== "propose") {
          logger.warn("[Graph:Turn] Agent returned unexpected action on turn 0, forcing to propose", { action: turn.action });
          turn.action = "propose";
        }

        const parts = [{ kind: "data" as const, data: turn }];
        const message = await database.createMessage({
          conversationId: state.conversationId,
          senderId: `agent:${ownUser.id}`,
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
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error("[Graph:Turn] Agent invocation failed", { error: errMsg, stack: err instanceof Error ? err.stack : undefined, turnCount: state.turnCount });
        traceEmitter?.({ type: "agent_end", name: agentName, durationMs: Date.now() - agentStart, summary: `error: ${errMsg}` });
        return {
          lastTurn: {
            action: "reject" as const,
            assessment: { reasoning: `Agent error: ${errMsg}`, suggestedRoles: { ownUser: "peer" as const, otherUser: "peer" as const } },
          },
          turnCount: state.turnCount + 1,
          error: `Turn failed: ${errMsg}`,
        };
      }
    };

    const evaluateNode = (state: typeof NegotiationGraphState.State): string => {
      if (state.status === 'waiting_for_agent') return "finalize";
      if (state.error) return "finalize";
      if (!state.lastTurn) return "finalize";
      if (state.lastTurn.action === "accept") return "finalize";
      if (state.lastTurn.action === "reject") return "finalize";
      // question routes same as counter — next turn
      if (state.maxTurns > 0 && state.turnCount >= state.maxTurns) return "finalize";
      return "turn";
    };

    const finalizeNode = async (state: typeof NegotiationGraphState.State) => {
      if (state.status === 'waiting_for_agent') {
        return {};
      }

      const history: NegotiationTurn[] = state.messages.map((m) => {
        const dataPart = (m.parts as Array<{ kind?: string; data?: unknown }>).find((p) => p.kind === "data");
        return dataPart?.data as NegotiationTurn;
      }).filter(Boolean);

      const lastTurn = state.lastTurn;
      const hasOpportunity = lastTurn?.action === "accept";
      const atCap = state.maxTurns > 0 && state.turnCount >= state.maxTurns && lastTurn?.action !== "accept" && lastTurn?.action !== "reject";

      let agreedRoles: NegotiationOutcome["agreedRoles"] = [];
      if (hasOpportunity && history.length >= 2) {
        const acceptTurn = history[history.length - 1];
        const precedingTurn = history[history.length - 2];
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
        agreedRoles,
        reasoning: lastTurn?.assessment.reasoning ?? "",
        turnCount: state.turnCount,
        ...(atCap && { reason: "turn_cap" as const }),
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
  reasoning: string;
  valencyRole: string;
  networkId?: string;
  candidateUser: UserNegotiationContext;
  /** The explicit search query that triggered discovery (if any). */
  discoveryQuery?: string;
}

export interface NegotiationResult {
  userId: string;
  agreedRoles: NegotiationOutcome["agreedRoles"];
  reasoning: string;
  turnCount: number;
}

/**
 * Runs bilateral negotiation for each candidate in parallel.
 * @returns Only candidates that produced an opportunity
 */
export async function negotiateCandidates(
  negotiationGraph: NegotiationGraphLike,
  sourceUser: UserNegotiationContext,
  candidates: NegotiationCandidate[],
  indexContext: { networkId: string; prompt: string },
  opts?: { maxTurns?: number; traceEmitter?: TraceEmitter; indexContextOverrides?: Map<string, string>; timeoutMs?: number },
): Promise<NegotiationResult[]> {
  const { maxTurns, traceEmitter, indexContextOverrides, timeoutMs } = opts ?? {};

  const results = await Promise.all(
    candidates.map(async (candidate) => {
      const start = Date.now();
      traceEmitter?.({ type: "agent_start", name: "Negotiating candidate" });

      try {
        const candidateIndexContext = candidate.networkId
          ? { networkId: candidate.networkId, prompt: indexContextOverrides?.get(candidate.networkId) ?? '' }
          : indexContext;

        const result = await negotiationGraph.invoke({
          sourceUser,
          candidateUser: candidate.candidateUser,
          indexContext: candidateIndexContext,
          seedAssessment: {
            reasoning: candidate.reasoning,
            valencyRole: candidate.valencyRole,
          },
          ...(candidate.discoveryQuery && { discoveryQuery: candidate.discoveryQuery }),
          ...(maxTurns !== undefined && { maxTurns }),
          ...(timeoutMs !== undefined && { timeoutMs }),
        });

        const durationMs = Date.now() - start;
        const outcome = result.outcome;
        const hasOpportunity = outcome?.hasOpportunity === true;

        const turnFlow = (result.messages ?? [])
          .map((m) => {
            const dataPart = (m.parts as Array<{ kind?: string; data?: Record<string, unknown> }>)?.find((p) => p.kind === "data");
            if (!dataPart?.data) return null;
            const turn = dataPart.data as { action?: string };
            return turn.action ?? "unknown";
          })
          .filter(Boolean)
          .join(" → ");

        const statusTag = hasOpportunity ? "✓ opportunity" : "✗ rejected";
        traceEmitter?.({ type: "agent_end", name: "Negotiating candidate", durationMs, summary: `${candidate.userId}: ${turnFlow} ${statusTag}` });

        if (hasOpportunity && outcome) {
          return {
            userId: candidate.userId,
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
 */
export function createDefaultNegotiationGraph(deps: {
  database: NegotiationDatabase;
  dispatcher: AgentDispatcher;
  timeoutQueue?: NegotiationTimeoutQueue;
}) {
  const factory = new NegotiationGraphFactory(deps.database, deps.dispatcher, deps.timeoutQueue);
  return factory.createGraph();
}
