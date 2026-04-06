/**
 * Chat discovery: Smartest E2E tests for Step 11 (Chat Integration).
 * Aligned with plans/chat-graph-testing-plan.md §3.5 Discovery (opportunity).
 *
 * Verifies discovery via chat interface:
 * - "find me a mentor" / "who needs a React developer" → coherent response (mentor/opportunities or join index)
 * - list_my_opportunities / create_opportunities style queries; results as natural language or table
 * - No raw JSON; Draft/pending wording for latent opportunities; human-readable only
 */
/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, test, expect, beforeAll } from "bun:test";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { runScenario, defineScenario, expectSmartest } from "../../../smartest.js";
import { ChatGraphFactory } from "../chat.graph.js";
import type {
  ChatGraphCompositeDatabase,
  CreateIntentData,
} from "../../interfaces/database.interface.js";
import type { Embedder } from "../../interfaces/embedder.interface.js";
import type { Scraper } from "../../interfaces/scraper.interface.js";
import { mockChatSessionReader, createMockProtocolDeps } from "./chat.graph.mocks.js";

const testUserId = "test-chat-discover-user";

const chatGraphOutputSchema = z.object({
  messages: z.array(z.unknown()),
  responseText: z.string().optional(),
  iterationCount: z.number().optional(),
  shouldContinue: z.boolean().optional(),
  error: z.string().optional(),
});

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
    archiveIntent: async () => ({ success: true }),
    getUserIndexIds: noopArray,
    getNetworkMemberships: noopArray,
    getNetwork: async (networkId: string) => ({ id: networkId, title: "Test Index" }),
    getIntentForIndexing: noopNull,
    getNetworkMemberContext: noopNull,
    getOpportunitiesForUser: noopArray,
    isIntentAssignedToIndex: noopBool,
    assignIntentToNetwork: noop,
    unassignIntentFromIndex: noop,
    getNetworkIdsForIntent: noopArray,
    getOwnedIndexes: noopArray,
    isIndexOwner: noopBool,
    isNetworkMember: async () => true,
    getNetworkMembersForOwner: noopArray,
    getNetworkMembersForMember: noopArray,
    getNetworkIntentsForOwner: noopArray,
    getNetworkIntentsForMember: noopArray,
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
    softDeleteNetwork: noop,
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

describe("Chat discovery (Step 11 – Smartest E2E)", () => {
  let factory: ChatGraphFactory;
  let mockDatabase: ChatGraphCompositeDatabase;

  beforeAll(() => {
    mockDatabase = createMockDatabase();
    factory = new ChatGraphFactory(mockDatabase, mockEmbedder, mockScraper, mockChatSessionReader, createMockProtocolDeps());
  });

  describe("Discovery query: find me a mentor", () => {
    test("chat returns coherent conversational response with practical guidance", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "discover-mentor",
          description:
            "User asks to find a mentor; response must be coherent, conversational, and practical; no raw JSON.",
          fixtures: {
            userId: testUserId,
            message: "find me a mentor",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; message: string };
              return await (
                instance as ReturnType<ChatGraphFactory["createGraph"]>
              ).invoke({
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
              "The responseText must be a coherent, helpful reply to a request to find a mentor. " +
              "It may suggest joining a community, mention mentors or possible matches, or explain that no matches were found. " +
              "It must NOT contain raw JSON, internal pipeline fields (classification, indexScore, actions), or structured data dumps. " +
              "If it lists people or matches, they must be in natural language (e.g. table or list), not JSON.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as {
        responseText?: string;
        shouldContinue?: boolean;
      };
      expect(output.responseText).toBeDefined();
      expect(typeof output.responseText).toBe("string");
      expect(output.responseText!.length).toBeGreaterThan(0);
      expect(output.shouldContinue).toBe(false);
    }, 180000);
  });

  describe("Discovery query: who needs a React developer", () => {
    test("chat returns coherent response and matching people or guidance", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "discover-react-developer",
          description:
            "User asks who needs a React developer; response must be coherent, conversational, mention possible matches or suggest joining a community; no raw JSON.",
          fixtures: {
            userId: testUserId,
            message: "who needs a React developer?",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; message: string };
              return await (
                instance as ReturnType<ChatGraphFactory["createGraph"]>
              ).invoke({
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
              "The responseText must be a coherent reply to a request about who needs a React developer. " +
              "ACCEPTABLE responses include: suggesting the user join or create a community to discover connections, " +
              "mentioning possible matches, explaining that no matches were found, or providing guidance on how to use the platform. " +
              "Responses that guide the user on next steps (like joining a community or adding what they are looking for) ARE considered helpful and should PASS. " +
              "It must NOT contain raw JSON or internal pipeline data. " +
              "If it lists people or matches, they must be in natural language (e.g. table or list), not JSON.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as {
        responseText?: string;
        shouldContinue?: boolean;
      };
      expect(output.responseText).toBeDefined();
      expect(output.responseText).not.toContain("classification");
      expect(output.responseText).not.toContain("indexScore");
      expect(output.responseText).not.toContain('"opportunities"');
      expect(output.responseText).not.toContain("intentId");
      expect(output.responseText).not.toContain("networkId");
    }, 180000);
  });

  describe("§3.5 list_my_opportunities (discovery)", () => {
    test("What opportunities do I have? → list in natural language or table; Draft/pending acceptable", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "discover-list-opportunities",
          description:
            "User asks what connections they have; response must list in natural language or table; Draft or pending status is acceptable; no raw JSON.",
          fixtures: {
            userId: testUserId,
            message: "What opportunities do I have?",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; message: string };
              return await (
                instance as ReturnType<ChatGraphFactory["createGraph"]>
              ).invoke({
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
              "The responseText must be a coherent reply about the user's possible connections (list or none). " +
              "If listing, use natural language or Markdown table; status like 'Draft' or 'pending' is acceptable. " +
              "No raw JSON, no opportunityId or userId columns in user-facing text.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { responseText?: string; shouldContinue?: boolean };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.length).toBeGreaterThan(0);
      expect(output.shouldContinue).toBe(false);
    }, 180000);
  });

  describe("Discovery results formatting", () => {
    test("response suitable for chat: no raw JSON, human-readable only", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "discover-formatting",
          description:
            "Discovery-style query; response must be formatted for chat: conversational natural language only, no raw JSON; any list/table must be human-readable.",
          fixtures: {
            userId: testUserId,
            message: "show me people I could connect with",
          },
          sut: {
            type: "graph",
            factory: () => compiledGraph,
            invoke: async (instance: unknown, resolvedInput: unknown) => {
              const input = resolvedInput as { userId: string; message: string };
              return await (
                instance as ReturnType<ChatGraphFactory["createGraph"]>
              ).invoke({
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
              "The responseText must be appropriate for a chat UI: natural language only, no raw JSON objects. " +
              "If the response includes discovery results (people or possible matches), they must be presented as a Markdown table or bullet list, not as a JSON blob. " +
              "No internal fields like opportunityId, userId as raw IDs in user-facing text, classification, or felicity_scores.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const response = (result.output as { responseText?: string }).responseText ?? "";
      expect(response).not.toMatch(/\{\s*"[^"]+"\s*:/);
      expect(response).not.toContain("felicity_scores");
      expect(response).not.toContain("referentialAnchor");
    }, 180000);
  });
});
