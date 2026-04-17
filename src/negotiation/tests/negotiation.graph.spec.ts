import { describe, it, expect } from "bun:test";
import { NegotiationGraphFactory } from "../negotiation.graph.js";
import { NegotiationGraphState } from "../negotiation.state.js";

function mkStubs() {
  const messages: Array<{ id: string; senderId: string; parts: unknown[]; createdAt: Date }> = [];
  const database = {
    createConversation: async () => ({ id: "conv-1" }),
    createTask: async () => ({ id: "task-1" }),
    updateOpportunityStatus: async () => {},
    createMessage: async (p: { conversationId: string; senderId: string; parts: unknown[] }) => {
      const msg = { id: `msg-${messages.length}`, senderId: p.senderId, parts: p.parts, createdAt: new Date() };
      messages.push(msg);
      return msg;
    },
    updateTaskState: async () => {},
    createArtifact: async () => {},
    setTaskTurnContext: async () => {},
  } as unknown as ConstructorParameters<typeof NegotiationGraphFactory>[0];

  const dispatcher = {
    hasPersonalAgent: async () => false,
    dispatch: async () => ({ handled: false, reason: "no-agent" }),
  } as unknown as ConstructorParameters<typeof NegotiationGraphFactory>[1];

  return { database, dispatcher, messages };
}

describe("negotiation graph — negotiation_turn emission", () => {
  it("emits negotiation_turn with correct payload after each turn", async () => {
    // Stub IndexNegotiator.invoke so the test is fully hermetic — no LLM calls.
    const { IndexNegotiator } = await import("../negotiation.agent.js");
    const origInvoke = IndexNegotiator.prototype.invoke;
    IndexNegotiator.prototype.invoke = async function () {
      return {
        action: "propose" as const,
        assessment: {
          reasoning: "stub reasoning",
          suggestedRoles: { ownUser: "agent" as const, otherUser: "patient" as const },
        },
        message: "hi",
      };
    };

    try {
      const { database, dispatcher } = mkStubs();
      const factory = new NegotiationGraphFactory(database, dispatcher);
      const graph = factory.createGraph();

      const events: Array<Record<string, unknown>> = [];
      const traceEmitter = (e: Record<string, unknown>) => events.push(e);

      const { requestContext } = await import("../../shared/observability/request-context.js");
      await requestContext.run({ traceEmitter: traceEmitter as never }, async () => {
        await graph.invoke({
          sourceUser: { id: "u-src", intents: [], profile: { name: "Alice" } },
          candidateUser: { id: "u-cand", intents: [], profile: { name: "Bob" } },
          indexContext: { networkId: "net-1", prompt: "" },
          seedAssessment: { reasoning: "x", valencyRole: "peer" },
          opportunityId: "opp-1",
          maxTurns: 2,
        } as Partial<typeof NegotiationGraphState.State>);
      });

      const turnEvents = events.filter((e) => e.type === "negotiation_turn");
      expect(turnEvents.length).toBeGreaterThanOrEqual(1);
      const first = turnEvents[0];
      expect(first.opportunityId).toBe("opp-1");
      expect(first.negotiationConversationId).toBe("conv-1");
      expect(first.turnIndex).toBe(0);
      expect(first.actor).toBe("source");
      expect(typeof first.action).toBe("string");
      expect(typeof first.durationMs).toBe("number");
      expect(first.reasoning).toBe("stub reasoning");
      expect(first.message).toBe("hi");
      expect(first.suggestedRoles).toEqual({ ownUser: "agent", otherUser: "patient" });
    } finally {
      IndexNegotiator.prototype.invoke = origInvoke;
    }
  }, 30000);
});
