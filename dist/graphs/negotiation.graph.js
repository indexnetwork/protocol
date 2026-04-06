import { StateGraph } from "@langchain/langgraph";
import { requestContext } from "../support/request-context.js";
import { NegotiationGraphState } from "../states/negotiation.state.js";
import { protocolLogger } from "../support/protocol.logger.js";
const logger = protocolLogger("NegotiationGraph");
/**
 * Factory for the bilateral negotiation LangGraph state machine.
 * @remarks Accepts dependencies via constructor for testability.
 */
export class NegotiationGraphFactory {
    constructor(database, proposer, responder) {
        this.database = database;
        this.proposer = proposer;
        this.responder = responder;
    }
    createGraph() {
        const { database, proposer, responder } = this;
        const initNode = async (state) => {
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
                    currentSpeaker: "source",
                    turnCount: 0,
                };
            }
            catch (err) {
                return { error: `Init failed: ${err instanceof Error ? err.message : String(err)}` };
            }
        };
        const turnNode = async (state) => {
            try {
                const history = state.messages.map((m) => {
                    const dataPart = m.parts.find((p) => p.kind === "data");
                    return dataPart?.data;
                }).filter(Boolean);
                const isSource = state.currentSpeaker === "source";
                const agent = isSource ? proposer : responder;
                const ownUser = isSource ? state.sourceUser : state.candidateUser;
                const otherUser = isSource ? state.candidateUser : state.sourceUser;
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
                const parts = [{ kind: "data", data: turn }];
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
                            role: "agent",
                            parts: message.parts,
                            createdAt: message.createdAt,
                        }],
                    turnCount: state.turnCount + 1,
                    currentSpeaker: (isSource ? "candidate" : "source"),
                    lastTurn: turn,
                };
            }
            catch (err) {
                return {
                    lastTurn: {
                        action: "reject",
                        assessment: { fitScore: 0, reasoning: `Agent error: ${err instanceof Error ? err.message : String(err)}`, suggestedRoles: { ownUser: "peer", otherUser: "peer" } },
                    },
                    turnCount: state.turnCount + 1,
                    error: `Turn failed: ${err instanceof Error ? err.message : String(err)}`,
                };
            }
        };
        const evaluateNode = (state) => {
            if (state.error)
                return "finalize";
            if (!state.lastTurn)
                return "finalize";
            if (state.lastTurn.action === "accept")
                return "finalize";
            if (state.lastTurn.action === "reject")
                return "finalize";
            if (state.turnCount >= state.maxTurns)
                return "finalize";
            return "turn";
        };
        const finalizeNode = async (state) => {
            const history = state.messages.map((m) => {
                const dataPart = m.parts.find((p) => p.kind === "data");
                return dataPart?.data;
            }).filter(Boolean);
            const lastTurn = state.lastTurn;
            const hasOpportunity = lastTurn?.action === "accept";
            const atCap = state.turnCount >= state.maxTurns && lastTurn?.action === "counter";
            const scores = history.map((t) => t.assessment.fitScore);
            const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            let agreedRoles = [];
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
            const outcome = {
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
            }
            catch (err) {
                logger.error("[Graph:Finalize] Failed to persist outcome", { error: err });
            }
            return { outcome };
        };
        const workflow = new StateGraph(NegotiationGraphState)
            .addNode("init", initNode)
            .addNode("turn", turnNode)
            .addNode("finalize", finalizeNode)
            .addConditionalEdges("turn", evaluateNode, {
            turn: "turn",
            finalize: "finalize",
        })
            .addConditionalEdges("init", (state) => {
            return state.error ? "finalize" : "turn";
        }, { turn: "turn", finalize: "finalize" })
            .addEdge("__start__", "init")
            .addEdge("finalize", "__end__");
        return workflow.compile();
    }
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
export async function negotiateCandidates(negotiationGraph, sourceUser, candidates, indexContext, opts) {
    const { maxTurns, traceEmitter, indexContextOverrides } = opts ?? {};
    const results = await Promise.all(candidates.map(async (candidate) => {
        const start = Date.now();
        traceEmitter?.({ type: "agent_start", name: "Negotiating candidate" });
        try {
            // Use per-candidate index context; never fall back to a different index's prompt
            const candidateIndexContext = candidate.indexId
                ? { indexId: candidate.indexId, prompt: indexContextOverrides?.get(candidate.indexId) ?? '' }
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
            });
            const durationMs = Date.now() - start;
            const outcome = result.outcome;
            const hasOpportunity = outcome?.hasOpportunity === true;
            // Build inline turn flow: "propose:85 → counter:70 → accept:78"
            const turnFlow = (result.messages ?? [])
                .map((m) => {
                const dataPart = m.parts?.find((p) => p.kind === "data");
                if (!dataPart?.data)
                    return null;
                const turn = dataPart.data;
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
        }
        catch (err) {
            const durationMs = Date.now() - start;
            traceEmitter?.({ type: "agent_end", name: "Negotiating candidate", durationMs, summary: `${candidate.userId}: error` });
            logger.error("[negotiateCandidates] Negotiation failed", { candidateUserId: candidate.userId, error: err });
            return null;
        }
    }));
    return results.filter((r) => r !== null);
}
/**
 * Creates a negotiation graph with the provided dependencies.
 * @param deps.database - Conversation database adapter
 * @param deps.proposer - Agent that proposes negotiation terms
 * @param deps.responder - Agent that responds to negotiation proposals
 */
export function createDefaultNegotiationGraph(deps) {
    const factory = new NegotiationGraphFactory(deps.database, deps.proposer, deps.responder);
    return factory.createGraph();
}
//# sourceMappingURL=negotiation.graph.js.map