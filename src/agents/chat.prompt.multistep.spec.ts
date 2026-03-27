/**
 * Chat Prompt Multi-Step Tests: verify module activation across iterations and turns.
 *
 * Unlike chat.prompt.modules.spec.ts (single-step triggers) and
 * chat.prompt.dynamic.spec.ts (LLM-driven behavioral tests), these tests
 * simulate realistic multi-iteration and multi-turn conversations by building
 * up message histories and asserting which modules are injected at each step.
 *
 * No LLM calls — purely deterministic buildSystemContent / resolveModules checks.
 */
/** Config */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, test, expect } from "bun:test";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

import type { ResolvedToolContext } from "../tools/index.js";
import { buildSystemContent } from "./chat.prompt.js";
import {
  extractRecentToolCalls,
  resolveModules,
  type IterationContext,
} from "./chat.prompt.modules.js";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(
  overrides: Partial<ResolvedToolContext> = {},
): ResolvedToolContext {
  return {
    userId: "user-1",
    userName: "Alice Test",
    userEmail: "alice@example.com",
    user: { id: "user-1", name: "Alice Test", email: "alice@example.com" },
    userProfile: { bio: "Builder", skills: ["typescript"], interests: ["AI"] },
    userIndexes: [
      {
        networkId: "idx-personal",
        indexTitle: "My Network",
        indexPrompt: null,
        permissions: ["owner"],
        memberPrompt: null,
        autoAssign: false,
        isPersonal: true,
        joinedAt: "2024-01-01T00:00:00Z",
      },
      {
        networkId: "idx-community",
        indexTitle: "AI Builders",
        indexPrompt: "AI enthusiasts",
        permissions: ["member"],
        memberPrompt: null,
        autoAssign: true,
        isPersonal: false,
        joinedAt: "2024-02-01T00:00:00Z",
      },
    ],
    isOnboarding: false,
    hasName: true,
    ...overrides,
  } as unknown as ResolvedToolContext;
}

/** Build an IterationContext from a message array, optionally overriding ctx. */
function iterCtxFrom(
  messages: BaseMessage[],
  ctx?: ResolvedToolContext,
): IterationContext {
  const lastHuman = messages
    .filter((m) => m._getType() === "human")
    .pop();
  return {
    recentTools: extractRecentToolCalls(messages),
    currentMessage:
      lastHuman && typeof lastHuman.content === "string"
        ? lastHuman.content
        : undefined,
    ctx: ctx ?? makeCtx(),
  };
}

let tcCounter = 0;
function tcId(): string {
  return `tc-${++tcCounter}`;
}

/** Append a tool call (AIMessage + ToolMessage) to a message array. Returns new array. */
function withToolCall(
  messages: BaseMessage[],
  name: string,
  args: Record<string, unknown> = {},
  toolResult = "ok",
): BaseMessage[] {
  const id = tcId();
  return [
    ...messages,
    new AIMessage({
      content: "",
      tool_calls: [{ id, name, args, type: "tool_call" as const }],
    }),
    new ToolMessage({ tool_call_id: id, content: toolResult, name }),
  ];
}

/** Append a new user turn (HumanMessage) to a message array. */
function withUserTurn(
  messages: BaseMessage[],
  text: string,
): BaseMessage[] {
  return [...messages, new HumanMessage(text)];
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Multi-step: discovery flow", () => {
  test("iteration 1 (no tools yet) → no modules; iteration 2 (after create_opportunities) → discovery module", () => {
    const ctx = makeCtx();

    // Iteration 1: user just sent the message, no tool calls yet
    const iter1Messages = [new HumanMessage("find me a mentor in AI")];
    const iter1 = iterCtxFrom(iter1Messages, ctx);
    const iter1Result = resolveModules(iter1);
    expect(iter1Result).toBe("");

    // Iteration 2: agent called create_opportunities
    const iter2Messages = withToolCall(iter1Messages, "create_opportunities", {
      searchQuery: "mentor in AI",
    });
    const iter2 = iterCtxFrom(iter2Messages, ctx);
    const iter2Result = resolveModules(iter2);
    expect(iter2Result).toContain("### 1. User wants to find connections or discover");
    expect(iter2Result).toContain("### 7. Opportunities in chat");
    expect(iter2Result).not.toContain("### 6. Introduce two people");
  });

  test("discovery module persists across iterations within same turn", () => {
    const ctx = makeCtx();

    // Iteration 2: agent called create_opportunities
    let messages: BaseMessage[] = [new HumanMessage("find me a mentor")];
    messages = withToolCall(messages, "create_opportunities", { searchQuery: "mentor" });

    // Iteration 3: agent then called read_user_profiles (person-lookup joins)
    messages = withToolCall(messages, "read_user_profiles", { query: "Bob" });

    const iterCtx = iterCtxFrom(messages, ctx);
    const result = resolveModules(iterCtx);

    // Both modules should be active
    expect(result).toContain("### 1. User wants to find connections or discover");
    expect(result).toContain("### 0. User asks about a specific person by name");
  });
});

describe("Multi-step: discovery → signal follow-up (multi-turn)", () => {
  test("turn 2 resets tool context; create_intent activates intent-creation module", () => {
    const ctx = makeCtx();

    // Turn 1: discovery
    let turn1: BaseMessage[] = [new HumanMessage("find me a mentor in AI")];
    turn1 = withToolCall(turn1, "create_opportunities", { searchQuery: "mentor" });

    // Verify turn 1 has discovery module
    const turn1Ctx = iterCtxFrom(turn1, ctx);
    expect(resolveModules(turn1Ctx)).toContain("### 1. User wants to find connections");

    // Turn 2: user sends follow-up
    let turn2 = withUserTurn(turn1, "yes, create a signal for that");

    // Before any tool calls in turn 2 → no modules (tool context reset)
    const turn2PreTool = iterCtxFrom(turn2, ctx);
    expect(resolveModules(turn2PreTool)).toBe("");

    // Agent calls create_intent in turn 2
    turn2 = withToolCall(turn2, "create_intent", {
      description: "Looking for a mentor in AI",
    });

    const turn2PostTool = iterCtxFrom(turn2, ctx);
    const turn2Result = resolveModules(turn2PostTool);

    // Intent-creation active, discovery gone (no create_opportunities in turn 2)
    expect(turn2Result).toContain("### 2. User explicitly wants to create or save an intent");
    expect(turn2Result).not.toContain("### 1. User wants to find connections");
  });
});

describe("Multi-step: person lookup → direct connection", () => {
  test("@mention triggers mentions module, then read_user_profiles adds person-lookup, then create_opportunities adds discovery", () => {
    const ctx = makeCtx();

    // Iteration 1: user mentions someone
    let messages: BaseMessage[] = [
      new HumanMessage("tell me about @[Alice Smith](user-alice)"),
    ];
    const iter1 = iterCtxFrom(messages, ctx);
    const iter1Result = resolveModules(iter1);
    // Only mentions module via regex
    expect(iter1Result).toContain("@[Display Name](userId)");
    expect(iter1Result).not.toContain("### 0. User asks about a specific person");

    // Iteration 2: agent looked up the person
    messages = withToolCall(messages, "read_user_profiles", { userId: "user-alice" });
    const iter2 = iterCtxFrom(messages, ctx);
    const iter2Result = resolveModules(iter2);
    // Person-lookup via trigger + mentions via regex
    expect(iter2Result).toContain("### 0. User asks about a specific person by name");
    expect(iter2Result).toContain("@[Display Name](userId)");

    // Iteration 3: agent decides to connect → calls create_opportunities
    messages = withToolCall(messages, "create_opportunities", {
      targetUserId: "user-alice",
      searchQuery: "shared interest in AI",
    });
    const iter3 = iterCtxFrom(messages, ctx);
    const iter3Result = resolveModules(iter3);
    // Discovery + person-lookup + mentions all active
    expect(iter3Result).toContain("### 1. User wants to find connections or discover");
    expect(iter3Result).toContain("### 0. User asks about a specific person by name");
    expect(iter3Result).toContain("@[Display Name](userId)");
  });
});

describe("Multi-step: introduction flow with exclusion", () => {
  test("gathering context activates person-lookup + shared-context; create_opportunities with partyUserIds activates introduction and excludes discovery", () => {
    const ctx = makeCtx();

    // Iteration 1: user asks to introduce two people
    let messages: BaseMessage[] = [
      new HumanMessage("introduce @[Alice](user-a) and @[Bob](user-b)"),
    ];

    // Iteration 2: agent gathers context
    messages = withToolCall(messages, "read_user_profiles", { userId: "user-a" });
    messages = withToolCall(messages, "read_index_memberships", { userId: "user-a" });
    const iter2 = iterCtxFrom(messages, ctx);
    const iter2Result = resolveModules(iter2);
    // person-lookup + shared-context active
    expect(iter2Result).toContain("### 0. User asks about a specific person by name");
    expect(iter2Result).toContain("### 5. Find shared context between two users");
    // No introduction or discovery yet
    expect(iter2Result).not.toContain("### 6. Introduce two people");
    expect(iter2Result).not.toContain("### 1. User wants to find connections");

    // Iteration 3: agent calls create_opportunities with partyUserIds (introduction)
    messages = withToolCall(messages, "create_opportunities", {
      partyUserIds: ["user-a", "user-b"],
      entities: [],
    });
    const iter3 = iterCtxFrom(messages, ctx);
    const iter3Result = resolveModules(iter3);
    // Introduction module active
    expect(iter3Result).toContain("### 6. Introduce two people");
    // Discovery module excluded by introduction
    expect(iter3Result).not.toContain("### 1. User wants to find connections or discover");
    // person-lookup and shared-context still active
    expect(iter3Result).toContain("### 0. User asks about a specific person by name");
    expect(iter3Result).toContain("### 5. Find shared context between two users");
  });
});

describe("Multi-step: URL scraping → intent creation", () => {
  test("URL in message triggers scraping module via regex; after scrape_url + create_intent both modules active", () => {
    const ctx = makeCtx();

    // Iteration 1: user sends URL
    let messages: BaseMessage[] = [
      new HumanMessage("check out https://example.com/article and create a signal from it"),
    ];
    const iter1 = iterCtxFrom(messages, ctx);
    const iter1Result = resolveModules(iter1);
    // URL scraping via regex
    expect(iter1Result).toContain("### 3. User includes a URL");
    expect(iter1Result).not.toContain("### 2. User explicitly wants to create");

    // Iteration 2: agent scraped the URL
    messages = withToolCall(messages, "scrape_url", {
      url: "https://example.com/article",
    });
    const iter2 = iterCtxFrom(messages, ctx);
    const iter2Result = resolveModules(iter2);
    // URL scraping still active (both regex and trigger now)
    expect(iter2Result).toContain("### 3. User includes a URL");

    // Iteration 3: agent creates intent from scraped content
    messages = withToolCall(messages, "create_intent", {
      description: "Advances in AI healthcare applications",
    });
    const iter3 = iterCtxFrom(messages, ctx);
    const iter3Result = resolveModules(iter3);
    // Both URL scraping and intent-creation active
    expect(iter3Result).toContain("### 3. User includes a URL");
    expect(iter3Result).toContain("### 2. User explicitly wants to create or save an intent");
  });
});

describe("Multi-step: buildSystemContent integration", () => {
  test("system prompt grows as modules activate across iterations", () => {
    const ctx = makeCtx();

    // Baseline: no iteration context → no modules
    const baseline = buildSystemContent(ctx);
    expect(baseline).not.toContain("### 1. User wants to find connections");

    // Iteration 1: no tools → same as baseline
    const iter1Messages = [new HumanMessage("find people")];
    const iter1Ctx = iterCtxFrom(iter1Messages, ctx);
    const iter1Prompt = buildSystemContent(ctx, iter1Ctx);
    expect(iter1Prompt).toBe(baseline);

    // Iteration 2: after create_opportunities → modules injected
    const iter2Messages = withToolCall(
      iter1Messages,
      "create_opportunities",
      { searchQuery: "AI" },
    );
    const iter2Ctx = iterCtxFrom(iter2Messages, ctx);
    const iter2Prompt = buildSystemContent(ctx, iter2Ctx);
    expect(iter2Prompt.length).toBeGreaterThan(baseline.length);
    expect(iter2Prompt).toContain("### 1. User wants to find connections or discover");

    // Core sections remain intact
    expect(iter2Prompt).toContain("You are Index.");
    expect(iter2Prompt).toContain("## Tools Reference");
    expect(iter2Prompt).toContain("### Output Format");
  });

  test("multi-turn: system prompt resets modules when tool context resets", () => {
    const ctx = makeCtx();

    // Turn 1: discovery active
    let turn1: BaseMessage[] = [new HumanMessage("find mentors")];
    turn1 = withToolCall(turn1, "create_opportunities", { searchQuery: "mentors" });
    const turn1Prompt = buildSystemContent(ctx, iterCtxFrom(turn1, ctx));
    expect(turn1Prompt).toContain("### 1. User wants to find connections");

    // Turn 2: new user message, no tool calls yet → modules reset
    const turn2 = withUserTurn(turn1, "now list my intents");
    const turn2Prompt = buildSystemContent(ctx, iterCtxFrom(turn2, ctx));
    expect(turn2Prompt).not.toContain("### 1. User wants to find connections");
    expect(turn2Prompt).not.toContain("### 2. User explicitly wants to create");
  });
});

describe("Multi-step: disambiguation edge cases", () => {
  test("create_opportunities with both searchQuery and partyUserIds → introduction wins (partyUserIds is the intro signal)", () => {
    const ctx = makeCtx();
    let messages: BaseMessage[] = [new HumanMessage("connect these two people")];
    messages = withToolCall(messages, "create_opportunities", {
      searchQuery: "AI collaboration",
      partyUserIds: ["user-a", "user-b"],
    });

    const iterCtx = iterCtxFrom(messages, ctx);
    const result = resolveModules(iterCtx);
    expect(result).toContain("### 6. Introduce two people");
    expect(result).not.toContain("### 1. User wants to find connections or discover");
  });

  test("create_opportunities with introTargetUserId (discover-for-person) → introduction wins", () => {
    const ctx = makeCtx();
    let messages: BaseMessage[] = [
      new HumanMessage("who should I introduce to @[Alice](user-a)?"),
    ];
    messages = withToolCall(messages, "create_opportunities", {
      introTargetUserId: "user-a",
    });

    const iterCtx = iterCtxFrom(messages, ctx);
    const result = resolveModules(iterCtx);
    expect(result).toContain("### 6. Introduce two people");
    expect(result).toContain("### 6a. Discover who to introduce to someone");
    expect(result).not.toContain("### 1. User wants to find connections or discover");
  });

  test("two create_opportunities calls — one discovery, one introduction — introduction excludes discovery", () => {
    const ctx = makeCtx();
    let messages: BaseMessage[] = [new HumanMessage("help me connect")];
    // First call: discovery-style
    messages = withToolCall(messages, "create_opportunities", { searchQuery: "AI" });
    // Second call: introduction-style
    messages = withToolCall(messages, "create_opportunities", {
      partyUserIds: ["user-a", "user-b"],
    });

    const iterCtx = iterCtxFrom(messages, ctx);
    const result = resolveModules(iterCtx);
    // Both triggers fire, but introduction's triggerFilter wins and its excludes removes discovery
    expect(result).toContain("### 6. Introduce two people");
    expect(result).not.toContain("### 1. User wants to find connections or discover");
  });

  test("contacts flow: add_contact then list_contacts — single contacts module (no duplication)", () => {
    const ctx = makeCtx();
    let messages: BaseMessage[] = [new HumanMessage("add alice@example.com and show my contacts")];
    messages = withToolCall(messages, "add_contact", { email: "alice@example.com" });
    messages = withToolCall(messages, "list_contacts", {});

    const iterCtx = iterCtxFrom(messages, ctx);
    const result = resolveModules(iterCtx);
    // Contacts module active once (Map deduplicates by module ID)
    expect(result).toContain("### 9. Import contacts from Gmail");
    const count = (result.match(/### 9\. Import contacts from Gmail/g) ?? []).length;
    expect(count).toBe(1);
  });
});
