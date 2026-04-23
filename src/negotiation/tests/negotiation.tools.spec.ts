import { describe, expect, test } from "bun:test";
import { createNegotiationTools } from "../negotiation.tools.js";
import type { ToolDeps, ResolvedToolContext } from "../../shared/agent/tool.helpers.js";

function makeContext(userId = "user-src"): ResolvedToolContext {
  return {
    userId,
    user: { id: userId, name: "Alice", email: "a@test" } as never,
    userProfile: null,
    userNetworks: [],
    isMcp: true,
  } as unknown as ResolvedToolContext;
}

function captureTool(name: string, deps: Partial<ToolDeps>) {
  let captured: { handler: (i: { context: ResolvedToolContext; query: unknown }) => Promise<string> } | undefined;
  const defineTool = (def: { name: string; handler: (...args: unknown[]) => unknown }) => {
    if (def.name === name) captured = def as typeof captured;
    return def;
  };
  createNegotiationTools(defineTool as never, deps as ToolDeps);
  return captured!;
}

function makeTask(state: string, sourceUserId: string, candidateUserId: string) {
  return {
    id: "task-1",
    conversationId: "conv-1",
    state,
    metadata: { type: "negotiation", sourceUserId, candidateUserId, maxTurns: 6 },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  };
}

function makeMessage(action: string, reasoning: string, message: string | null) {
  return {
    parts: [{ kind: "data", data: { action, assessment: { reasoning }, message } }],
  };
}

// ── isUsersTurn ────────────────────────────────────────────────────────────────

describe("list_negotiations — isUsersTurn", () => {
  test("completed negotiation always returns isUsersTurn=false even when parity says it is their turn", async () => {
    // 1 message → parity says source's turn → but status=completed → must be false
    const task = makeTask("completed", "user-src", "user-cand");
    const msg = makeMessage("propose", "reasoning", "proposal message");

    const deps = {
      negotiationDatabase: {
        getTasksForUser: async () => [task],
        getMessagesForConversation: async () => [msg],
      },
    };

    const tool = captureTool("list_negotiations", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: {} })
    );

    expect(result.success).toBe(true);
    expect(result.data.negotiations[0].isUsersTurn).toBe(false);
  });

  test("active negotiation with 0 messages → source's turn → isUsersTurn=true for source", async () => {
    const task = makeTask("working", "user-src", "user-cand");

    const deps = {
      negotiationDatabase: {
        getTasksForUser: async () => [task],
        getMessagesForConversation: async () => [],
      },
    };

    const tool = captureTool("list_negotiations", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: {} })
    );

    expect(result.data.negotiations[0].status).toBe("active");
    expect(result.data.negotiations[0].isUsersTurn).toBe(true);
  });
});

// ── latestMessagePreview ───────────────────────────────────────────────────────

describe("list_negotiations — latestMessagePreview", () => {
  test("uses message field, not assessment.reasoning", async () => {
    const task = makeTask("completed", "user-src", "user-cand");
    const msg = makeMessage("accept", "Internal chain-of-thought reasoning here.", "I accept this connection.");

    const deps = {
      negotiationDatabase: {
        getTasksForUser: async () => [task],
        getMessagesForConversation: async () => [msg],
      },
    };

    const tool = captureTool("list_negotiations", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: {} })
    );

    const preview = result.data.negotiations[0].latestMessagePreview;
    expect(preview).toBe("I accept this connection.");
    expect(preview).not.toContain("chain-of-thought");
  });

  test("returns null preview when message is null", async () => {
    const task = makeTask("completed", "user-src", "user-cand");
    const msg = makeMessage("accept", "Internal reasoning.", null);

    const deps = {
      negotiationDatabase: {
        getTasksForUser: async () => [task],
        getMessagesForConversation: async () => [msg],
      },
    };

    const tool = captureTool("list_negotiations", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: {} })
    );

    expect(result.data.negotiations[0].latestMessagePreview).toBeNull();
  });
});

// ── pagination ─────────────────────────────────────────────────────────────────

describe("list_negotiations — pagination", () => {
  function makeTasks(n: number) {
    return Array.from({ length: n }, (_, i) =>
      makeTask("completed", "user-src", `user-cand-${i}`)
    ).map((t, i) => ({ ...t, id: `task-${i}` }));
  }

  test("returns first page with limit=2", async () => {
    const tasks = makeTasks(5);

    const deps = {
      negotiationDatabase: {
        getTasksForUser: async () => tasks,
        getMessagesForConversation: async () => [],
      },
    };

    const tool = captureTool("list_negotiations", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: { limit: 2, page: 1 } })
    );

    expect(result.data.negotiations).toHaveLength(2);
    expect(result.data.totalCount).toBe(5);
    expect(result.data.totalPages).toBe(3);
    expect(result.data.page).toBe(1);
  });

  test("returns second page", async () => {
    const tasks = makeTasks(5);

    const deps = {
      negotiationDatabase: {
        getTasksForUser: async () => tasks,
        getMessagesForConversation: async () => [],
      },
    };

    const tool = captureTool("list_negotiations", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: { limit: 2, page: 2 } })
    );

    expect(result.data.negotiations).toHaveLength(2);
    expect(result.data.page).toBe(2);
  });

  test("no pagination params → returns all results without totalCount", async () => {
    const tasks = makeTasks(3);

    const deps = {
      negotiationDatabase: {
        getTasksForUser: async () => tasks,
        getMessagesForConversation: async () => [],
      },
    };

    const tool = captureTool("list_negotiations", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: {} })
    );

    expect(result.data.negotiations).toHaveLength(3);
    expect(result.data.totalCount).toBeUndefined();
  });
});

// ── get_negotiation isUsersTurn ───────────────────────────────────────────────

describe("get_negotiation — isUsersTurn", () => {
  test("completed negotiation always returns isUsersTurn=false", async () => {
    const task = makeTask("completed", "user-src", "user-cand");
    const msg = makeMessage("accept", "reasoning", "accepted");

    const deps = {
      negotiationDatabase: {
        getTask: async () => task,
        getMessagesForConversation: async () => [msg],
        getArtifactsForTask: async () => [],
      },
    };

    const tool = captureTool("get_negotiation", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-src"), query: { negotiationId: "task-1" } })
    );

    expect(result.success).toBe(true);
    expect(result.data.isUsersTurn).toBe(false);
  });
});
