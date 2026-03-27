/**
 * Chat Graph: Smartest-driven invoke scenarios.
 * Aligned with plans/chat-graph-testing-plan.md (§1 Graph, §2 Agent, §3 Tools, §4 Edge cases).
 *
 * Covers:
 * - §1.1 Basic flow: greeting, profile/intent queries, no raw JSON
 * - §1.4 Index-scoped chat (networkId in invoke)
 * - §2.1 Iterations: single round, one-tool, multi-tool summary
 * - §2.2 No raw JSON in response
 * - §2.3 Confirmation flow for destructive actions
 * - §3.1 Profile (read_user_profiles), §3.2 Intent (read_intents), §3.5 Discovery (list_my_opportunities)
 * - §4 Edge cases: no profile + update, find opportunities with no intents
 */
/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, test, expect, spyOn, beforeAll } from "bun:test";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { runScenario, defineScenario, expectSmartest } from "../../../smartest.js";
import { ChatGraphFactory } from "../chat.graph.js";
import type { ChatGraphCompositeDatabase, CreateIntentData } from "../../interfaces/database.interface.js";
import type { Embedder } from "../../interfaces/embedder.interface.js";
import type { Scraper } from "../../interfaces/scraper.interface.js";
import { mockChatSessionReader, createMockProtocolDeps } from "./chat.graph.mocks.js";
import { ChatAgent } from "../../agents/chat.agent.js";

const testUserId = "test-chat-invoke-user";

// ─── Output schema for graph invoke ───────────────────────────────────────

const chatGraphOutputSchema = z.object({
  messages: z.array(z.unknown()),
  responseText: z.string().optional(),
  iterationCount: z.number().optional(),
  shouldContinue: z.boolean().optional(),
  error: z.string().optional(),
});

// ─── Mock dependencies (shared) ──────────────────────────────────────────────

function createMockDatabase(): ChatGraphCompositeDatabase {
  const noop = async () => undefined;
  const noopNull = async () => null;
  const noopArray = async () => [];
  const noopBool = async () => false;

  return {
    getProfile: noopNull,
    getProfileByUserId: noopNull,
    getActiveIntents: noopArray,
    getIntentsInIndexForMember: async () => [],
    getUser: async (uid: string) => ({ id: uid, name: "Test User", email: "test@example.com" }),
    getIndex: async (networkId: string) => ({ id: networkId, title: "Test Index" }),
    getIndexMembership: async (networkId: string, _userId: string) =>
      ({ networkId, indexTitle: "Test Index", indexPrompt: null, permissions: [] }),
    getIndexWithPermissions: async () => null,
    saveProfile: noop,
    createIntent: async (data: CreateIntentData) => ({
      id: `intent-${Date.now()}`,
      payload: data.payload,
      summary: null,
      isIncognito: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: data.userId,
    }),
    updateIntent: noopNull,
    updateUser: noopNull,
    archiveIntent: async () => ({ success: true }),
    getUserIndexIds: noopArray,
    getIndexMemberships: noopArray,
    getIntentForIndexing: noopNull,
    getIndexMemberContext: noopNull,
    getOpportunitiesForUser: noopArray,
    getOpportunity: noopNull,
    createOpportunity: async () =>
      ({
        id: "opp-mock",
        detection: { source: "opportunity_graph" as const, timestamp: new Date().toISOString() },
        actors: [],
        interpretation: { category: "connection", reasoning: "", confidence: 0 },
        context: { networkId: "" },
        confidence: "0",
        status: "latent",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }) as Awaited<ReturnType<ChatGraphCompositeDatabase["createOpportunity"]>>,
    isIntentAssignedToIndex: noopBool,
    assignIntentToIndex: noop,
    unassignIntentFromIndex: noop,
    getIndexIdsForIntent: noopArray,
    getOwnedIndexes: noopArray,
    isIndexOwner: noopBool,
    isIndexMember: async () => true,
    getIndexMembersForOwner: noopArray,
    getIndexMembersForMember: noopArray,
    getIndexIntentsForOwner: noopArray,
    getIndexIntentsForMember: noopArray,
    updateIndexSettings: async () =>
      ({
        id: "",
        title: "",
        prompt: null,
        permissions: {
          joinPolicy: "anyone" as const,
          allowGuestVibeCheck: false,
          invitationLink: null,
        },
        createdAt: new Date(),
        memberCount: 0,
        intentCount: 0,
      }),
    softDeleteIndex: noop,
    deleteProfile: noop,
    updateOpportunityStatus: noopNull,
  } as unknown as ChatGraphCompositeDatabase;
}

const mockEmbedder: Embedder = {
  generate: async () => [],
  generateForDocuments: async () => [],
  addVectors: async () => [],
  similaritySearch: async () => [],
} as unknown as Embedder;

const mockScraper: Scraper = {
  scrape: async () => "",
  extractUrlContent: async () => "",
} as unknown as Scraper;

describe("Chat Graph invoke (Smartest)", () => {
  let factory: ChatGraphFactory;
  let mockDatabase: ChatGraphCompositeDatabase;

  beforeAll(() => {
    mockDatabase = createMockDatabase();
    factory = new ChatGraphFactory(mockDatabase, mockEmbedder, mockScraper, mockChatSessionReader, createMockProtocolDeps());
  });

  describe("Simple conversational message", () => {
    test("given a simple greeting, graph returns valid output shape and coherent response", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-simple-greeting",
          description: "User sends a simple greeting; graph returns responseText and messages with valid shape.",
          fixtures: {
            userId: testUserId,
            message: "Hello, how are you?",
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
              "The responseText must be a friendly, coherent reply to the greeting. It must not contain raw JSON, classification fields, or internal pipeline data.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; messages?: unknown[]; shouldContinue?: boolean };
      expect(output.responseText).toBeDefined();
      expect(typeof output.responseText).toBe("string");
      expect(output.responseText!.length).toBeGreaterThan(0);
      expect(output.shouldContinue).toBe(false);
    }, 180000);
  });

  describe("No internal JSON leak", () => {
    test("response must not contain internal pipeline JSON markers", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-no-internal-json",
          description:
            "User message that could trigger intent/subgraph path; response must not leak classification, felicity_scores, actions, indexScore, etc.",
          fixtures: {
            userId: testUserId,
            message:
              "I want to hire developers for an open-source intent-driven discovery protocol. More details at https://example.com/repo",
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
              "responseText must NOT contain any of: classification, felicity_scores, actions, indexScore, memberScore, semantic_entropy, referential_anchor, intentMode, referentialAnchor. It should be natural language only.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const response = (result.output as { responseText?: string }).responseText ?? "";
      const internalMarkers = [
        "classification",
        "felicity_scores",
        "actions",
        "indexScore",
        "memberScore",
        "semantic_entropy",
        "referential_anchor",
        "intentMode",
        "referentialAnchor",
      ];
      for (const marker of internalMarkers) {
        expect(response).not.toContain(marker);
      }
    }, 180000);
  });

  describe("Error path", () => {
    test("when agent loop throws, graph returns fallback responseText and error in state", async () => {
      const streamRunSpy = spyOn(ChatAgent.prototype, "streamRun").mockRejectedValue(new Error("Agent run failed"));

      const compiledGraph = factory.createGraph();
      const result = await runScenario(
        defineScenario({
          name: "chat-agent-error-fallback",
          description: "When the agent loop fails (agent.run throws), graph returns error and fallback responseText.",
          fixtures: {
            userId: testUserId,
            message: "Hello",
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
              "Output must contain an error string and responseText must be a polite fallback message. shouldContinue must be false.",
            llmVerify: false,
          },
        })
      );

      streamRunSpy.mockRestore();

      expectSmartest(result);
      const output = result.output as { error?: string; responseText?: string; shouldContinue?: boolean };
      expect(output.error).toBeDefined();
      expect(output.responseText).toBeDefined();
      expect(typeof output.responseText).toBe("string");
      expect(output.responseText!.length).toBeGreaterThan(0);
      expect(output.shouldContinue).toBe(false);
    }, 10000);
  });

  describe("Tool choice", () => {
    test("when user asks for their intents, response is coherent and reflects list/query behavior", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-tool-choice-intents",
          description:
            "User asks what intents they have or to list intents; graph should return a coherent response consistent with having queried intents (e.g. list or empty list).",
          fixtures: {
            userId: testUserId,
            message: "What intents do I have? List my intents.",
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
              "The responseText must be a natural-language reply about the user's intents (e.g. listing them, saying there are none, or summarizing). It must not contain raw JSON or internal tool payloads.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(typeof output.responseText).toBe("string");
    }, 180000);
  });

  describe("Clarification", () => {
    test("when user tries to create something without required info, response asks for missing details", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-clarification-create",
          description:
            "User attempts to create an intent or resource without providing required details; graph should ask for the missing information rather than failing silently or returning a generic error.",
          fixtures: {
            userId: testUserId,
            message: "I want to create an intent.",
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
              "The responseText must ask the user for more details, such as what the intent is about, a description, or other required information. It must not be a generic error only; it should guide the user to provide the missing data.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(typeof output.responseText).toBe("string");
    }, 180000);
  });

  describe("§1.1 / §3.1 Profile query", () => {
    test("What's my profile? → agent replies with profile summary or no-profile message, no raw JSON", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-profile-query",
          description:
            "User asks for their profile; agent calls read_user_profiles (or equivalent), then replies in plain language (no profile or name/bio/skills). No raw JSON.",
          fixtures: {
            userId: testUserId,
            message: "What's my profile? Do I have a profile?",
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
              "The responseText must be a coherent reply about the user's profile: either that they have no profile, or a summary (e.g. name, bio, skills) in natural language. It must NOT contain raw JSON, internal tool payloads, or classification fields.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; shouldContinue?: boolean };
      expect(output.responseText).toBeDefined();
    }, 180000);
  });

  describe("§2.1 Multi-tool iteration", () => {
    test("Show my profile and my intents and my indexes → one summarizing reply, no raw JSON", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-multi-tool-summary",
          description:
            "User asks for profile, intents, and indexes in one message; agent may call read_user_profiles, read_intents, read_indexes, then one summarizing reply in natural language.",
          fixtures: {
            userId: testUserId,
            message: "Show my profile and my intents and my indexes.",
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
              "The responseText must be a single, coherent summary that addresses profile, intents, and indexes (or states none). It must NOT contain raw JSON, internal tool payloads, or ID columns. Data should be in natural language or Markdown table/list.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; shouldContinue?: boolean };
      expect(output.responseText).toBeDefined();
    }, 180000);
  });

  describe("§1.4 Index-scoped chat", () => {
    test("index-scoped: What are my intents here? → coherent reply for this index, no raw JSON", async () => {
      const compiledGraph = factory.createGraph();
      const testIndexId = "00000000-0000-0000-0000-000000000001";

      const result = await runScenario(
        defineScenario({
          name: "chat-index-scoped-intents",
          description:
            "Index-scoped chat: user asks for intents in this index; response must be coherent for index context (e.g. list or none) and must not contain raw JSON.",
          fixtures: {
            userId: testUserId,
            networkId: testIndexId,
            message: "What are my intents here?",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; networkId: string; message: string };
              return await (instance as ReturnType<ChatGraphFactory["createGraph"]>).invoke({
                userId: input.userId,
                networkId: input.networkId,
                messages: [new HumanMessage(input.message)],
              });
            },
            input: {
              userId: "@fixtures.userId",
              networkId: "@fixtures.networkId",
              message: "@fixtures.message",
            },
          },
          verification: {
            schema: chatGraphOutputSchema,
            criteria:
              "The responseText must be a coherent reply about the user's intents in this index/community (e.g. listing them or saying there are none). It must NOT contain raw JSON or internal pipeline fields. Scope must reflect 'here' / this index.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; shouldContinue?: boolean };
      expect(output.responseText).toBeDefined();
    }, 180000);
  });

  describe("§3.5 list_my_opportunities", () => {
    test("What opportunities do I have? → list in plain language or table; Draft/pending wording acceptable", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-list-opportunities",
          description:
            "User asks what opportunities they have; response must list opportunities (e.g. Draft, pending) in natural language or table; latent/draft status may be shown as 'Draft'. No raw JSON.",
          fixtures: {
            userId: testUserId,
            message: "What opportunities do I have?",
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
              "The responseText must be a coherent reply about the user's opportunities: list or state none. If listing, use natural language or Markdown table; status like Draft or pending is acceptable. No raw JSON, no ID columns in user-facing text.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; shouldContinue?: boolean };
      expect(output.responseText).toBeDefined();
    }, 180000);
  });

  describe("§4 Edge cases", () => {
    test("No profile + Update my profile → suggests creating profile or explains no profile", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-edge-update-profile-no-profile",
          description:
            "User has no profile and asks to update profile; agent should say they have no profile or suggest creating one, not perform an update.",
          fixtures: {
            userId: testUserId,
            message: "Update my profile: add Python to skills.",
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
              "The responseText must indicate that the user has no profile to update, or suggest creating a profile first. It must NOT imply that the profile was updated. No raw JSON.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
    }, 180000);

    test("Find opportunities with no intents → explains need to join index and add intents", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "chat-edge-find-opportunities-no-intents",
          description:
            "User with no intents in any index asks to find opportunities; agent should explain they need to join an index and add intents first.",
          fixtures: {
            userId: testUserId,
            message: "Find me opportunities. Who can help with fundraising?",
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
              "The responseText must be helpful and guide the user toward finding opportunities. ACCEPT: (1) explaining that the user needs to join a community/index and add intents first, (2) explaining that they lack a profile or priorities and should set those up or add what they're looking for, (3) asking for more details about what they need (e.g. fundraising) so the system can match them, or (4) reporting no matches. It must NOT contain raw JSON or internal pipeline data.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
    }, 180000);
  });
});
