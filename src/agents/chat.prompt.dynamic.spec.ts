/**
 * Chat Prompt Dynamic Modules: Smartest-driven behavioral tests.
 *
 * Verifies that the dynamically assembled prompt (core + modules) produces
 * correct agent behavior for key scenarios:
 *   1. Discovery routing (core rule, no module needed on first iteration)
 *   2. URL triggers scraping module
 *   3. @mention handling triggers mentions module
 *   4. Multi-turn: discovery → signal follow-up
 *   5. Multi-turn: URL scraping → intent creation across turns
 *   6. Multi-turn: @mention → person lookup → direct connection
 *   7. Multi-turn: intent creation → intent management (update)
 *   8. Multi-turn: community exploration → discovery (module reset)
 *   9. Introduction between two mentioned people (triggerFilter + excludes)
 *  10. Contacts: add a contact
 *
 * These tests invoke the full chat graph with real LLM calls.
 */
/** Config */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, test, expect, beforeAll } from "bun:test";
import { z } from "zod";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";

import { runScenario, defineScenario, expectSmartest } from "../../smartest.js";
import { ChatGraphFactory } from "../graphs/chat.graph.js";
import type { Embedder } from "../interfaces/embedder.interface.js";
import type { Scraper } from "../interfaces/scraper.interface.js";
import {
  createChatGraphMockDb,
  mockProfile,
  mockActiveIntent,
  createMockProtocolDeps,
} from "../graphs/tests/chat.graph.mocks.js";
import type { ChatSessionReader } from "../interfaces/chat-session.interface.js";
import type { NetworkMembership } from "../interfaces/database.interface.js";

/**
 * Checks if any AIMessage in the output messages array made a tool call with the given name.
 */
function hasToolCall(messages: unknown[], toolName: string): boolean {
  if (!Array.isArray(messages)) return false;
  return messages.some((msg) => {
    const m = msg as BaseMessage;
    if (m?._getType?.() === "ai") {
      const toolCalls = (m as { tool_calls?: Array<{ name: string }> }).tool_calls;
      return toolCalls?.some((tc) => tc.name === toolName) ?? false;
    }
    return false;
  });
}

/**
 * Extracts tool call args for a specific tool from the messages array.
 */
function getToolCallArgs(
  messages: unknown[],
  toolName: string,
): Record<string, unknown> | undefined {
  if (!Array.isArray(messages)) return undefined;
  for (const msg of messages) {
    const m = msg as BaseMessage;
    if (m?._getType?.() === "ai") {
      const toolCalls = (m as { tool_calls?: Array<{ name: string; args: Record<string, unknown> }> }).tool_calls;
      const match = toolCalls?.find((tc) => tc.name === toolName);
      if (match) return match.args;
    }
  }
  return undefined;
}

const testUserId = "test-dynamic-prompt-user";

const chatGraphOutputSchema = z.object({
  messages: z.array(z.unknown()),
  responseText: z.string().optional(),
  iterationCount: z.number().optional(),
  shouldContinue: z.boolean().optional(),
  error: z.string().optional(),
});

const mockEmbedder: Embedder = {
  generate: async () => [],
  generateForDocuments: async () => [],
  addVectors: async () => [],
  similaritySearch: async () => [],
} as unknown as Embedder;

const mockScraper: Scraper = {
  scrape: async (_url: string) => "Scraped content: This article discusses advances in artificial intelligence and machine learning applications in healthcare.",
  extractUrlContent: async (_url: string) => "Scraped content: This article discusses advances in artificial intelligence and machine learning applications in healthcare.",
} as unknown as Scraper;

/** Returns a user record with onboarding completed so tests don't enter onboarding mode. */
function completedUser(userId: string, nameOverride?: string) {
  return {
    id: userId,
    name: nameOverride ?? "Test User",
    email: `${userId}@example.com`,
    onboarding: { completedAt: new Date().toISOString() },
  };
}

/** Shared index that multiple test users belong to. */
const SHARED_INDEX_ID = "idx-shared-ai-builders";
const SHARED_INDEX = { id: SHARED_INDEX_ID, title: "AI Builders" };

/** Build an NetworkMembership for a user in the shared index. */
function sharedMembership(extra?: Partial<NetworkMembership>): NetworkMembership {
  return {
    networkId: SHARED_INDEX_ID,
    networkTitle: "AI Builders",
    indexPrompt: "AI enthusiasts and builders",
    permissions: ["member"],
    memberPrompt: null,
    autoAssign: false,
    isPersonal: false,
    joinedAt: new Date(),
    ...extra,
  };
}

const mockChatSession: ChatSessionReader = { getSessionMessages: async () => [] };
const mockProtocolDeps = createMockProtocolDeps();

describe("Chat Prompt Dynamic Modules (Smartest)", () => {
  let factory: ChatGraphFactory;

  beforeAll(() => {
    const mockDatabase = createChatGraphMockDb({
      getUser: (userId: string) => completedUser(userId),
    });
    factory = new ChatGraphFactory(mockDatabase, mockEmbedder, mockScraper, mockChatSession, mockProtocolDeps);
  });

  describe("Discovery routing (core rule, no module needed)", () => {
    test("'find me a mentor in AI' calls create_opportunities, not create_intent", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "dynamic-prompt-discovery-routing",
          description:
            "User says 'find me a mentor in AI'. The core prompt rule routes connection-seeking to create_opportunities, not create_intent. This validates the first iteration before any modules are loaded.",
          fixtures: {
            userId: testUserId,
            message: "find me a mentor in AI",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; message: string };
              return await (instance as ReturnType<ChatGraphFactory["createGraph"]>).invoke({
                userId: input.userId,
                messages: [new HumanMessage(input.message)],
              });
            },
            input: {
              userId: "@fixtures.userId",
              message: "@fixtures.message",
            },
          },
          verification: {
            schema: chatGraphOutputSchema,
            criteria:
              "Agent must have called create_opportunities tool (not create_intent). Response should present connections or state no matches found.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; messages?: unknown[] };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.length).toBeGreaterThan(0);

      // Deterministic: agent must have called create_opportunities, not create_intent
      expect(hasToolCall(output.messages ?? [], "create_opportunities")).toBe(true);
      expect(hasToolCall(output.messages ?? [], "create_intent")).toBe(false);
    }, 180000);
  });

  describe("URL triggers scraping module", () => {
    test("message with URL triggers scrape_url call", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "dynamic-prompt-url-scraping",
          description:
            "User sends a message containing a URL. The regex trigger on the url-scraping module should match, and the agent should call scrape_url with the URL before responding.",
          fixtures: {
            userId: testUserId,
            message: "check out https://example.com/article and tell me what it's about",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; message: string };
              return await (instance as ReturnType<ChatGraphFactory["createGraph"]>).invoke({
                userId: input.userId,
                messages: [new HumanMessage(input.message)],
              });
            },
            input: {
              userId: "@fixtures.userId",
              message: "@fixtures.message",
            },
          },
          verification: {
            schema: chatGraphOutputSchema,
            criteria:
              "Agent must have called scrape_url tool with the URL. Response should summarize or reference the scraped content.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; messages?: unknown[] };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.length).toBeGreaterThan(0);

      // Deterministic: agent must have called scrape_url
      expect(hasToolCall(output.messages ?? [], "scrape_url")).toBe(true);
    }, 180000);
  });

  describe("@mention handling", () => {
    test("message with @[Name](userId) triggers read_user_profiles", async () => {
      const mockDatabase = createChatGraphMockDb({
        getUser: (userId: string) => {
          if (userId === "user-123") {
            return { id: "user-123", name: "Alice Smith", email: "alice@example.com", onboarding: { completedAt: new Date().toISOString() } };
          }
          return completedUser(userId);
        },
      });
      const mentionFactory = new ChatGraphFactory(mockDatabase, mockEmbedder, mockScraper, mockChatSession, mockProtocolDeps);
      const compiledGraph = mentionFactory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "dynamic-prompt-mention-handling",
          description:
            "User sends a message with @[Alice Smith](user-123) markup. The mentions module regex trigger should match, and the agent should extract the userId and call read_user_profiles to look up that user.",
          fixtures: {
            userId: testUserId,
            message: "tell me about @[Alice Smith](user-123)",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; message: string };
              return await (instance as ReturnType<ChatGraphFactory["createGraph"]>).invoke({
                userId: input.userId,
                messages: [new HumanMessage(input.message)],
              });
            },
            input: {
              userId: "@fixtures.userId",
              message: "@fixtures.message",
            },
          },
          verification: {
            schema: chatGraphOutputSchema,
            criteria:
              "Agent must have attempted to look up information about Alice (called read_user_profiles or similar tool). Response should mention Alice by name — either presenting information or acknowledging the lookup attempt.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; messages?: unknown[] };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.length).toBeGreaterThan(0);

      // Deterministic: agent must have called read_user_profiles
      expect(hasToolCall(output.messages ?? [], "read_user_profiles")).toBe(true);
    }, 180000);
  });

  // ─── Multi-turn tests ──────────────────────────────────────────────────────

  describe("Multi-turn: discovery → signal creation", () => {
    test("turn 1: discover connections; turn 2: user asks to create a signal → agent calls create_intent", async () => {
      const compiledGraph = factory.createGraph();

      // ── Turn 1: discovery ──
      const turn1 = await compiledGraph.invoke({
        userId: testUserId,
        messages: [new HumanMessage("find me a mentor in AI")],
      });

      expect(turn1.responseText).toBeDefined();
      expect(hasToolCall(turn1.messages, "create_opportunities")).toBe(true);

      // ── Turn 2: user asks to create a signal from the discovery ──
      const turn2Messages = [
        ...turn1.messages,
        new HumanMessage(
          "Yes, create a signal so others can find me for AI mentorship",
        ),
      ];

      const turn2 = await compiledGraph.invoke({
        userId: testUserId,
        messages: turn2Messages,
      });

      expect(turn2.responseText).toBeDefined();
      expect(turn2.responseText!.length).toBeGreaterThan(0);

      // Agent should have called create_intent in turn 2
      // Extract only turn 2's messages (after the last HumanMessage we added)
      const turn2NewMessages = turn2.messages.slice(turn1.messages.length + 1);
      expect(hasToolCall(turn2NewMessages, "create_intent")).toBe(true);
    }, 300000);
  });

  describe("Multi-turn: URL scraping → signal creation", () => {
    test("turn 1: user sends URL → agent scrapes; turn 2: user asks to create signal from it → agent calls create_intent", async () => {
      const compiledGraph = factory.createGraph();

      // ── Turn 1: URL scraping ──
      const turn1 = await compiledGraph.invoke({
        userId: testUserId,
        messages: [
          new HumanMessage(
            "check out https://example.com/ai-healthcare-article and tell me what it's about",
          ),
        ],
      });

      expect(turn1.responseText).toBeDefined();
      expect(hasToolCall(turn1.messages, "scrape_url")).toBe(true);

      // ── Turn 2: create signal from scraped content ──
      const turn2Messages = [
        ...turn1.messages,
        new HumanMessage("Create a signal from that article"),
      ];

      const turn2 = await compiledGraph.invoke({
        userId: testUserId,
        messages: turn2Messages,
      });

      expect(turn2.responseText).toBeDefined();
      expect(turn2.responseText!.length).toBeGreaterThan(0);

      // Agent should have called create_intent in turn 2
      const turn2NewMessages = turn2.messages.slice(turn1.messages.length + 1);
      expect(hasToolCall(turn2NewMessages, "create_intent")).toBe(true);
    }, 300000);
  });

  // ─── Multi-turn: @mention → person lookup → direct connection ────────────

  describe("Multi-turn: @mention → person lookup → direct connection", () => {
    test("turn 1: look up @mentioned person; turn 2: connect us → agent calls create_opportunities with targetUserId", async () => {
      const mentionDb = createChatGraphMockDb({
        getUser: (userId: string) => {
          if (userId === "user-alice")
            return completedUser("user-alice", "Alice Smith");
          return completedUser(userId);
        },
        profile: mockProfile({ userId: testUserId, name: "Test User" }),
        networkMemberships: (userId: string) => {
          if (userId === testUserId || userId === "user-alice")
            return [sharedMembership()];
          return [];
        },
        isNetworkMember: (networkId: string, userId: string) =>
          networkId === SHARED_INDEX_ID &&
          (userId === testUserId || userId === "user-alice"),
        getNetwork: (networkId: string) =>
          networkId === SHARED_INDEX_ID ? SHARED_INDEX : null,
      });
      const mentionFactory = new ChatGraphFactory(
        mentionDb,
        mockEmbedder,
        mockScraper,
        mockChatSession,
        mockProtocolDeps,
      );
      const graph = mentionFactory.createGraph();

      // ── Turn 1: look up the mentioned person ──
      const turn1 = await graph.invoke({
        userId: testUserId,
        messages: [
          new HumanMessage("tell me about @[Alice Smith](user-alice)"),
        ],
      });

      expect(turn1.responseText).toBeDefined();
      expect(hasToolCall(turn1.messages, "read_user_profiles")).toBe(true);

      // ── Turn 2: connect with that person ──
      const turn2 = await graph.invoke({
        userId: testUserId,
        messages: [
          ...turn1.messages,
          new HumanMessage("I'd like to connect with her"),
        ],
      });

      expect(turn2.responseText).toBeDefined();
      expect(turn2.responseText!.length).toBeGreaterThan(0);

      // Agent should have called create_opportunities for direct connection.
      // Check full turn2 messages — turn1 didn't call create_opportunities,
      // so any occurrence is from turn 2.
      expect(hasToolCall(turn2.messages, "create_opportunities")).toBe(true);
    }, 300000);
  });

  // ─── Multi-turn: intent creation → intent management ─────────────────────

  describe("Multi-turn: intent listing → intent management", () => {
    test("turn 1: list my signals; turn 2: update one → agent calls update_intent", async () => {
      const intentDb = createChatGraphMockDb({
        getUser: (userId: string) => completedUser(userId),
        profile: mockProfile({ userId: testUserId, name: "Test User" }),
        activeIntents: (userId: string) => {
          if (userId === testUserId)
            return [
              mockActiveIntent({
                id: "intent-ai-collab",
                payload: "Looking for AI collaborators in healthcare",
              }),
              mockActiveIntent({
                id: "intent-design",
                payload: "Seeking UX designers for fintech startup",
              }),
            ];
          return [];
        },
      });
      const intentFactory = new ChatGraphFactory(
        intentDb,
        mockEmbedder,
        mockScraper,
        mockChatSession,
        mockProtocolDeps,
      );
      const graph = intentFactory.createGraph();

      // ── Turn 1: list existing signals ──
      const turn1 = await graph.invoke({
        userId: testUserId,
        messages: [new HumanMessage("What signals do I have?")],
      });

      expect(turn1.responseText).toBeDefined();
      expect(hasToolCall(turn1.messages, "read_intents")).toBe(true);

      // ── Turn 2: update one of them ──
      const turn2 = await graph.invoke({
        userId: testUserId,
        messages: [
          ...turn1.messages,
          new HumanMessage(
            "Update the AI collaborators one to focus on AI in drug discovery specifically",
          ),
        ],
      });

      expect(turn2.responseText).toBeDefined();
      expect(turn2.responseText!.length).toBeGreaterThan(0);

      // Agent should call update_intent (turn 1 only had read_intents)
      expect(hasToolCall(turn2.messages, "update_intent")).toBe(true);
    }, 300000);
  });

  // ─── Multi-turn: community exploration → discovery (module reset) ────────

  describe("Multi-turn: community exploration → discovery", () => {
    test("turn 1: ask about communities; turn 2: find connections → modules reset, discovery activates", async () => {
      const communityDb = createChatGraphMockDb({
        getUser: (userId: string) => completedUser(userId),
        profile: mockProfile({ userId: testUserId, name: "Test User" }),
        networkMemberships: (userId: string) => {
          if (userId === testUserId)
            return [
              sharedMembership(),
              {
                networkId: "idx-personal",
                networkTitle: "My Network",
                indexPrompt: null,
                permissions: ["owner"],
                memberPrompt: null,
                autoAssign: false,
                isPersonal: true,
                joinedAt: new Date(),
              },
            ];
          return [];
        },
        getNetwork: (networkId: string) => {
          if (networkId === SHARED_INDEX_ID) return SHARED_INDEX;
          if (networkId === "idx-personal")
            return { id: "idx-personal", title: "My Network" };
          return null;
        },
        isNetworkMember: (networkId: string, userId: string) =>
          userId === testUserId &&
          (networkId === SHARED_INDEX_ID || networkId === "idx-personal"),
      });
      const communityFactory = new ChatGraphFactory(
        communityDb,
        mockEmbedder,
        mockScraper,
        mockChatSession,
        mockProtocolDeps,
      );
      const graph = communityFactory.createGraph();

      // ── Turn 1: explore communities ──
      const turn1 = await graph.invoke({
        userId: testUserId,
        messages: [
          new HumanMessage("What communities am I part of?"),
        ],
      });

      expect(turn1.responseText).toBeDefined();
      // Agent should reference community info (may use preloaded data or read_indexes)

      // ── Turn 2: switch to discovery ──
      const turn2 = await graph.invoke({
        userId: testUserId,
        messages: [
          ...turn1.messages,
          new HumanMessage("Find me people interested in AI safety"),
        ],
      });

      expect(turn2.responseText).toBeDefined();
      expect(turn2.responseText!.length).toBeGreaterThan(0);

      // Agent should have called create_opportunities (discovery), not read_indexes
      const turn2NewMessages = turn2.messages.slice(turn1.messages.length + 1);
      expect(hasToolCall(turn2NewMessages, "create_opportunities")).toBe(true);
    }, 300000);
  });

  // ─── Introduction: triggerFilter + excludes disambiguation ────────────────

  describe("Introduction between two mentioned people", () => {
    test("'introduce @Alice and @Bob' → agent gathers context and calls create_opportunities with partyUserIds", async () => {
      const introDb = createChatGraphMockDb({
        getUser: (userId: string) => {
          if (userId === "user-alice")
            return completedUser("user-alice", "Alice Smith");
          if (userId === "user-bob")
            return completedUser("user-bob", "Bob Jones");
          return completedUser(userId);
        },
        profile: mockProfile({ userId: testUserId, name: "Test User" }),
        networkMemberships: (userId: string) => {
          if (
            userId === testUserId ||
            userId === "user-alice" ||
            userId === "user-bob"
          )
            return [sharedMembership()];
          return [];
        },
        isNetworkMember: (networkId: string, userId: string) =>
          networkId === SHARED_INDEX_ID &&
          [testUserId, "user-alice", "user-bob"].includes(userId),
        getNetwork: (networkId: string) =>
          networkId === SHARED_INDEX_ID ? SHARED_INDEX : null,
        activeIntents: (userId: string) => {
          if (userId === "user-alice")
            return [
              mockActiveIntent({ payload: "Looking for ML engineers" }),
            ];
          if (userId === "user-bob")
            return [
              mockActiveIntent({ payload: "Seeking AI research collaborators" }),
            ];
          return [];
        },
      });
      const introFactory = new ChatGraphFactory(
        introDb,
        mockEmbedder,
        mockScraper,
        mockChatSession,
        mockProtocolDeps,
      );
      const graph = introFactory.createGraph();

      const result = await graph.invoke({
        userId: testUserId,
        messages: [
          new HumanMessage(
            "I think @[Alice Smith](user-alice) and @[Bob Jones](user-bob) should meet — they're both into AI. Can you introduce them?",
          ),
        ],
      });

      expect(result.responseText).toBeDefined();
      expect(result.responseText!.length).toBeGreaterThan(0);

      // Agent must have called create_opportunities with partyUserIds (introduction flow)
      expect(hasToolCall(result.messages, "create_opportunities")).toBe(true);
      const oppArgs = getToolCallArgs(
        result.messages,
        "create_opportunities",
      );
      // partyUserIds or introTargetUserId should be present — this is an introduction, not a discovery
      const isIntroduction =
        oppArgs?.partyUserIds !== undefined ||
        oppArgs?.introTargetUserId !== undefined;
      expect(isIntroduction).toBe(true);

      // Agent should NOT have only used discovery-style (no partyUserIds/introTargetUserId)
      // If partyUserIds is set, verify it contains alice and bob
      if (oppArgs?.partyUserIds) {
        const parties = oppArgs.partyUserIds as string[];
        expect(parties).toContain("user-alice");
        expect(parties).toContain("user-bob");
      }
    }, 300000);
  });

  // ─── Contacts: add a contact ──────────────────────────────────────────────

  describe("Contacts management", () => {
    test("'add alice@test.com to my contacts' → agent calls add_contact", async () => {
      const graph = factory.createGraph();

      const result = await graph.invoke({
        userId: testUserId,
        messages: [
          new HumanMessage(
            "Add alice@test.com to my contacts. Her name is Alice.",
          ),
        ],
      });

      expect(result.responseText).toBeDefined();
      expect(result.responseText!.length).toBeGreaterThan(0);
      expect(hasToolCall(result.messages, "add_contact")).toBe(true);
    }, 180000);
  });
});
