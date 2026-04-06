/**
 * Tests for ChatGraph (agent loop architecture).
 * Quick smoke tests for creation and invoke. Comprehensive Smartest scenarios
 * and streaming tests live in ./tests/ (chat.graph.factory.spec.ts,
 * chat.graph.invoke.spec.ts, chat.graph.streaming.spec.ts).
 */
/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, expect, it, beforeAll } from "bun:test";
import { ChatGraphFactory } from "../chat.graph.js";
import type { ChatGraphCompositeDatabase, CreateIntentData } from "../../interfaces/database.interface.js";
import type { Embedder } from "../../interfaces/embedder.interface.js";
import type { Scraper } from "../../interfaces/scraper.interface.js";
import { mockChatSessionReader, createMockProtocolDeps } from "./chat.graph.mocks.js";

const testUserId = "test-chat-graph-user";

/**
 * Mock database for ChatGraph. Implements ChatGraphCompositeDatabase with in-memory storage.
 */
function createMockDatabase(): ChatGraphCompositeDatabase {
  const noop = async () => undefined;
  const noopNull = async () => null;
  const noopArray = async () => [];
  const noopBool = async () => false;

  return {
    getProfile: noopNull,
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
        permissions: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        memberCount: 0,
        intentCount: 0,
      }) as any,
    softDeleteNetwork: noop,
    deleteProfile: noop,
    updateOpportunityStatus: noopNull,
  } as unknown as ChatGraphCompositeDatabase;
}

/** Stub embedder for ChatGraph. */
const mockEmbedder: Embedder = {
  generate: async () => [],
  generateForDocuments: async () => [],
  addVectors: async () => [],
  similaritySearch: async () => [],
} as unknown as Embedder;

/** Stub scraper - returns placeholder content for URL extraction (used by create_intent when URLs present). */
const mockScraper: Scraper = {
  scrape: async () => "",
  extractUrlContent: async () => "Repository: indexnetwork/index. Intent-driven discovery protocol.",
} as unknown as Scraper;

describe("ChatGraphFactory", () => {
  let factory: ChatGraphFactory;
  let mockDatabase: ChatGraphCompositeDatabase;

  beforeAll(() => {
    mockDatabase = createMockDatabase();
    factory = new ChatGraphFactory(mockDatabase, mockEmbedder, mockScraper, mockChatSessionReader, createMockProtocolDeps());
  });

  describe("Graph Creation", () => {
    it("should create and compile a graph with createGraph", () => {
      const graph = factory.createGraph();
      expect(graph).toBeDefined();
      expect(typeof graph.invoke).toBe("function");
    });

    it("should create a streaming graph with createStreamingGraph without checkpointer", () => {
      const graph = factory.createStreamingGraph();
      expect(graph).toBeDefined();
      expect(typeof graph.invoke).toBe("function");
      expect(typeof graph.streamEvents).toBe("function");
    });

    it("should create a streaming graph with createStreamingGraph with MemorySaver checkpointer", async () => {
      const { MemorySaver } = await import("@langchain/langgraph");
      const checkpointer = new MemorySaver();
      const graph = factory.createStreamingGraph(checkpointer as any);
      expect(graph).toBeDefined();
      expect(typeof graph.streamEvents).toBe("function");
    });
  });
});
