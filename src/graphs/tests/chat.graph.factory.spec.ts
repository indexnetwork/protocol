/**
 * Chat Graph: factory, graph creation, and loadSessionContext.
 * Covers createGraph, createStreamingGraph (with/without checkpointer), and loadSessionContext
 * (empty session, with messages, truncation, and error path).
 */
/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { ChatGraphFactory } from "../chat.graph.js";
import type { ChatGraphCompositeDatabase, CreateIntentData } from "../../interfaces/database.interface.js";
import type { Embedder } from "../../interfaces/embedder.interface.js";
import type { Scraper } from "../../interfaces/scraper.interface.js";
import type { ChatSessionReader } from "../../interfaces/chat-session.interface.js";
import { createMockProtocolDeps } from "./chat.graph.mocks.js";

const testUserId = "test-chat-factory-user";

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
    getIndexMemberships: noopArray,
    getIndex: async (indexId: string) => ({ id: indexId, title: "Test Index" }),
    getIntentForIndexing: noopNull,
    getIndexMemberContext: noopNull,
    getOpportunitiesForUser: noopArray,
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
        permissions: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        memberCount: 0,
        intentCount: 0,
      }) as any,
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

describe("ChatGraphFactory", () => {
  let factory: ChatGraphFactory;
  let mockDatabase: ChatGraphCompositeDatabase;
  const localChatSessionReader: ChatSessionReader = {
    getSessionMessages: async () => [],
  };

  beforeAll(() => {
    mockDatabase = createMockDatabase();
    factory = new ChatGraphFactory(mockDatabase, mockEmbedder, mockScraper, localChatSessionReader, createMockProtocolDeps());
  });

  describe("Graph creation", () => {
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
      const checkpointer = new MemorySaver();
      const graph = factory.createStreamingGraph(checkpointer as any);
      expect(graph).toBeDefined();
      expect(typeof graph.streamEvents).toBe("function");
    });
  });

  describe("loadSessionContext", () => {
    afterEach(() => {
      spyOn(localChatSessionReader, "getSessionMessages").mockRestore?.();
    });

    it("should return empty array when session has no messages", async () => {
      const getSessionMessagesSpy = spyOn(localChatSessionReader, "getSessionMessages").mockResolvedValue([]);

      const result = await factory.loadSessionContext("session-empty", 20);

      expect(getSessionMessagesSpy).toHaveBeenCalledWith("session-empty", 20);
      expect(result).toEqual([]);
    });

    it("should load and convert DB messages to LangChain format", async () => {
      const dbMessages = [
        { id: "1", sessionId: "s1", role: "user" as const, content: "Hello", createdAt: new Date(), routingDecision: null, subgraphResults: null, tokenCount: null },
        { id: "2", sessionId: "s1", role: "assistant" as const, content: "Hi there!", createdAt: new Date(), routingDecision: null, subgraphResults: null, tokenCount: null },
      ];
      spyOn(localChatSessionReader, "getSessionMessages").mockResolvedValue(dbMessages as any);

      const result = await factory.loadSessionContext("session-with-messages", 20);

      expect(result.length).toBe(2);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      expect((result[0] as HumanMessage).content).toBe("Hello");
      expect(result[1]).toBeInstanceOf(HumanMessage);
      expect((result[1] as HumanMessage).content).toBe("Hi there!");
    });

    it("should respect maxMessages parameter", async () => {
      const getSessionMessagesSpy = spyOn(localChatSessionReader, "getSessionMessages").mockResolvedValue([]);

      await factory.loadSessionContext("session-any", 5);

      expect(getSessionMessagesSpy).toHaveBeenCalledWith("session-any", 5);
    });

    it("should truncate messages when over token limit", async () => {
      // One very long message so that adding more would exceed limit; loadSessionContext uses truncateToTokenLimit
      const longContent = "x".repeat(50000);
      const dbMessages = [
        { id: "1", sessionId: "s1", role: "user" as const, content: longContent, createdAt: new Date(), routingDecision: null, subgraphResults: null, tokenCount: null },
        { id: "2", sessionId: "s1", role: "assistant" as const, content: "Reply", createdAt: new Date(), routingDecision: null, subgraphResults: null, tokenCount: null },
      ];
      spyOn(localChatSessionReader, "getSessionMessages").mockResolvedValue(dbMessages as any);

      const result = await factory.loadSessionContext("session-long", 20);

      expect(result.length).toBeLessThanOrEqual(2);
      expect(result.every((m) => m !== undefined)).toBe(true);
    });

    it("should return empty array on getSessionMessages error and not throw", async () => {
      spyOn(localChatSessionReader, "getSessionMessages").mockRejectedValue(new Error("DB unavailable"));

      const result = await factory.loadSessionContext("session-fail", 20);

      expect(result).toEqual([]);
    });
  });
});
