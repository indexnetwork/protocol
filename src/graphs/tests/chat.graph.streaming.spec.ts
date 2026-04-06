/**
 * Chat Graph: streaming scenarios.
 * Tests streamChatEvents and streamChatEventsWithContext:
 * - Event sequence (status first, then token or error)
 * - Context loading (streamChatEventsWithContext uses loadSessionContext)
 */
/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import { HumanMessage } from "@langchain/core/messages";
import { ChatGraphFactory } from "../chat.graph.js";
import type { ChatGraphCompositeDatabase, CreateIntentData } from "../../interfaces/database.interface.js";
import type { Embedder } from "../../interfaces/embedder.interface.js";
import type { Scraper } from "../../interfaces/scraper.interface.js";
import type { ChatSessionReader } from "../../interfaces/chat-session.interface.js";
import { createMockProtocolDeps } from "./chat.graph.mocks.js";
import type { ChatStreamEvent } from "../../types/chat-streaming.types.js";

const testUserId = "test-chat-stream-user";
const testSessionId = "test-session-stream";

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

async function collectStreamEvents(gen: AsyncGenerator<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

describe("Chat Graph streaming", () => {
  let factory: ChatGraphFactory;
  const localChatSessionReader: ChatSessionReader = {
    getSessionMessages: async () => [],
  };

  beforeAll(() => {
    factory = new ChatGraphFactory(createMockDatabase(), mockEmbedder, mockScraper, localChatSessionReader, createMockProtocolDeps());
  });

  describe("streamChatEvents", () => {
    it("should yield at least status then token or error events", async () => {
      const events = await collectStreamEvents(
        factory.streamChatEvents(
          {
            userId: testUserId,
            messages: [new HumanMessage("Say hello in one word.")],
          },
          testSessionId
        )
      );

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("status");
      expect(events[0].sessionId).toBe(testSessionId);

      const hasToken = events.some((e) => e.type === "token");
      const hasError = events.some((e) => e.type === "error");
      expect(hasToken || hasError).toBe(true);

      events.forEach((e) => {
        expect(e).toHaveProperty("type");
        expect(e).toHaveProperty("sessionId");
        expect(e).toHaveProperty("timestamp");
      });
    }, 120000);

    it("should attribute all events to the given sessionId", async () => {
      const sessionId = "unique-session-123";
      const events = await collectStreamEvents(
        factory.streamChatEvents(
          { userId: testUserId, messages: [new HumanMessage("Hi")] },
          sessionId
        )
      );

      expect(events.every((e) => e.sessionId === sessionId)).toBe(true);
    }, 120000);
  });

  describe("streamChatEventsWithContext", () => {
    afterEach(() => {
      spyOn(localChatSessionReader, "getSessionMessages").mockRestore?.();
    });

    it("should load session context then stream events", async () => {
      spyOn(localChatSessionReader, "getSessionMessages").mockResolvedValue([]);

      const events = await collectStreamEvents(
        factory.streamChatEventsWithContext(
          {
            userId: testUserId,
            message: "Hello",
            sessionId: testSessionId,
            maxContextMessages: 10,
          }
        )
      );

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("status");
      const hasToken = events.some((e) => e.type === "token");
      const hasError = events.some((e) => e.type === "error");
      expect(hasToken || hasError).toBe(true);
    }, 120000);

    it("should call getSessionMessages with sessionId and maxContextMessages", async () => {
      const getSessionMessagesSpy = spyOn(localChatSessionReader, "getSessionMessages").mockResolvedValue([]);

      const events: ChatStreamEvent[] = [];
      for await (const e of factory.streamChatEventsWithContext({
        userId: testUserId,
        message: "Test",
        sessionId: "ctx-session-1",
        maxContextMessages: 5,
      })) {
        events.push(e);
        if (events.length >= 2) break;
      }

      expect(getSessionMessagesSpy).toHaveBeenCalledWith("ctx-session-1", 5);
    }, 120000);

    it("when getSessionMessages throws, loadSessionContext returns [] and stream still runs with current message only", async () => {
      // Factory's loadSessionContext catches and returns [] on error, so streamChatEventsWithContext
      // does not yield an error event; it proceeds with empty context + current message.
      spyOn(localChatSessionReader, "getSessionMessages").mockRejectedValue(new Error("DB error"));

      const events: ChatStreamEvent[] = [];
      for await (const e of factory.streamChatEventsWithContext({
        userId: testUserId,
        message: "Hello",
        sessionId: "fail-session",
      })) {
        events.push(e);
        if (events.length >= 1) break;
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("status");
    }, 5000);
  });
});
