/**
 * Chat Graph: Vocabulary compliance tests (Smartest-driven).
 *
 * Verifies that the LLM does not use banned words (e.g., "search") in responses,
 * even when the underlying tools involve discovery/matching operations.
 *
 * Per chat.prompt.ts:
 * - Banned words: search, leverage, unlock, optimize, scale, disrupt, revolutionary,
 *   AI-powered, maximize value, act fast, networking, match
 * - Preferred: looking up, look into, check, find matches, see who aligns, discover
 */
import { config } from "dotenv";
config({ path: ".env.test" });

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

const testUserId = "test-vocabulary-user";
const testIndexId = "test-vocabulary-index";

const chatGraphOutputSchema = z.object({
  messages: z.array(z.unknown()),
  responseText: z.string().optional(),
  iterationCount: z.number().optional(),
  shouldContinue: z.boolean().optional(),
  error: z.string().optional(),
});

const BANNED_WORDS = [
  "search",
  "searching",
  "searched",
];

function createMockDatabase(): ChatGraphCompositeDatabase {
  const noop = async () => undefined;
  const noopNull = async () => null;
  const noopArray = async () => [];
  const noopBool = async () => false;

  return {
    getProfile: async () => ({
      userId: testUserId,
      identity: { name: "Test User", bio: "Software engineer", location: "SF" },
      narrative: { context: "Building AI tools" },
      attributes: { skills: ["TypeScript", "AI"], interests: ["ML", "startups"] },
      embedding: null,
    }),
    getProfileByUserId: async () => null,
    getActiveIntents: async () => [
      {
        id: "intent-1",
        payload: "Looking for AI infrastructure engineers",
        summary: "Hiring AI engineers",
        createdAt: new Date(),
      },
    ],
    getIntentsInIndexForMember: async () => [],
    getUser: async (uid: string) => ({
      id: uid,
      name: "Test User",
      email: "test@example.com",
    }),
    getIndex: async (networkId: string) => ({ id: networkId, title: "AI Builders" }),
    getIndexMembership: async (networkId: string, _userId: string) => ({
      networkId,
      indexTitle: "AI Builders",
      indexPrompt: "Community for AI builders",
      permissions: ["member"],
    }),
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
    getUserIndexIds: async () => [testIndexId],
    getIndexMemberships: async () => [
      {
        networkId: testIndexId,
        indexTitle: "AI Builders",
        indexPrompt: "Community for AI builders",
        permissions: ["member"],
        memberPrompt: null,
        autoAssign: true,
        joinedAt: new Date(),
      },
    ],
    getIntentForIndexing: noopNull,
    getIndexMemberContext: noopNull,
    getOpportunitiesForUser: async () => [],
    getOpportunity: noopNull,
    createOpportunity: async () =>
      ({
        id: "opp-mock",
        detection: {
          source: "opportunity_graph" as const,
          timestamp: new Date().toISOString(),
        },
        actors: [],
        interpretation: { category: "connection", reasoning: "", confidence: 0 },
        context: { networkId: testIndexId },
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
    updateIndexSettings: async () => ({
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

describe("Chat Graph Vocabulary Compliance (Smartest)", () => {
  let factory: ChatGraphFactory;
  let mockDatabase: ChatGraphCompositeDatabase;

  beforeAll(() => {
    mockDatabase = createMockDatabase();
    factory = new ChatGraphFactory(mockDatabase, mockEmbedder, mockScraper, mockChatSessionReader, createMockProtocolDeps());
  });

  describe("Banned word: search", () => {
    test("when user asks to find connections, response must not use 'search'", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "vocabulary-no-search-discovery",
          description:
            "User asks to find connections or people. The LLM must use alternatives like 'look for', 'find', 'discover' — never 'search'.",
          fixtures: {
            userId: testUserId,
            message: "Can you find people who are working on AI infrastructure?",
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
              "The responseText must NOT contain the word 'search' (or 'searching', 'searched'). " +
              "The agent should use alternatives like 'looking up', 'look for', 'find', 'discover', 'check'. " +
              "The response should be helpful and natural.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const response =
        (result.output as { responseText?: string }).responseText ?? "";

      for (const banned of BANNED_WORDS) {
        const regex = new RegExp(`\\b${banned}\\b`, "i");
        expect(regex.test(response)).toBe(false);
      }
    }, 180000);

    test("when user asks about their opportunities, response must not use 'search'", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "vocabulary-no-search-opportunities",
          description:
            "User asks to see their opportunities or connections. Response must not use 'search'.",
          fixtures: {
            userId: testUserId,
            message: "Show me my opportunities",
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
              "The responseText must NOT contain the word 'search'. " +
              "Even when no opportunities exist, the response should say something like " +
              "'no opportunities found' or 'try creating intents to find connections' — never 'search for'.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const response =
        (result.output as { responseText?: string }).responseText ?? "";

      for (const banned of BANNED_WORDS) {
        const regex = new RegExp(`\\b${banned}\\b`, "i");
        expect(regex.test(response)).toBe(false);
      }
    }, 180000);

    test("when user wants to discover people, response uses preferred vocabulary", async () => {
      const compiledGraph = factory.createGraph();

      const result = await runScenario(
        defineScenario({
          name: "vocabulary-preferred-discovery",
          description:
            "User explicitly asks to 'search' for people. Agent must reframe using preferred vocabulary.",
          fixtures: {
            userId: testUserId,
            message: "Search for machine learning engineers in my network",
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
              "Even though the user said 'search', the agent's response must NOT echo 'search'. " +
              "It should use alternatives like 'looking for', 'finding', 'discovering', or 'checking'. " +
              "The response should be helpful and address the user's request.",
            llmVerify: true,
          },
        })
      );

      expectSmartest(result);
      const response =
        (result.output as { responseText?: string }).responseText ?? "";

      for (const banned of BANNED_WORDS) {
        const regex = new RegExp(`\\b${banned}\\b`, "i");
        expect(regex.test(response)).toBe(false);
      }
    }, 180000);
  });
});
