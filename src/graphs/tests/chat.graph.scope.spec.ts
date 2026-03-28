/**
 * Chat Graph: Scope workflows — index vs no index × intents × member vs owner.
 * Uses configurable mock data; schema + optional LLM verification.
 */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, test, expect } from "bun:test";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { runScenario, defineScenario, expectSmartest } from "../../../smartest.js";
import { ChatGraphFactory } from "../chat.graph.js";
import type { Embedder } from "../../interfaces/embedder.interface.js";
import type { Scraper } from "../../interfaces/scraper.interface.js";
import {
  createChatGraphMockDb,
  mockActiveIntent,
  mockIndexedIntent,
  mockChatSessionReader,
  createMockProtocolDeps,
} from "./chat.graph.mocks.js";

const testUserId = "scope-test-user";
const testIndexId = "00000000-0000-0000-4000-000000000001";

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
  scrape: async () => "",
  extractUrlContent: async () => "",
} as unknown as Scraper;

function runInvokeScenario(
  db: ReturnType<typeof createChatGraphMockDb>,
  message: string,
  options: { networkId?: string; userId?: string } = {}
) {
  const factory = new ChatGraphFactory(db, mockEmbedder, mockScraper, mockChatSessionReader, createMockProtocolDeps());
  const graph = factory.createGraph();
  const userId = options.userId ?? testUserId;
  return runScenario(
    defineScenario({
      name: `scope-${message.slice(0, 20).replace(/\s/g, "-")}`,
      description: `Scope workflow: ${message}`,
      fixtures: { userId, networkId: options.networkId, message },
      sut: {
        type: "graph",
        factory: () => graph,
        invoke: async (instance: unknown, resolvedInput: unknown) => {
          const input = resolvedInput as { userId: string; networkId?: string; message: string };
          return await (
            instance as ReturnType<ChatGraphFactory["createGraph"]>
          ).invoke({
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
        criteria: "Response must be coherent and not contain raw JSON.",
        llmVerify: false,
      },
    })
  );
}

describe("Chat Graph scope workflows", () => {
  describe("User-scoped (no index)", () => {
    test("no intents → list my intents returns empty / no intents message", async () => {
      const db = createChatGraphMockDb({
        activeIntents: () => [],
      });
      const result = await runInvokeScenario(db, "What are my intents? List my intents.");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.length).toBeGreaterThan(0);
    }, 60000);

    test("has intents → list my intents returns list or summary", async () => {
      const intents = [
        mockActiveIntent({ id: "i1", payload: "Looking for a co-founder" }),
        mockActiveIntent({ id: "i2", payload: "Learn Rust" }),
      ];
      const db = createChatGraphMockDb({
        activeIntents: (userId) => (userId === testUserId ? intents : []),
      });
      const result = await runInvokeScenario(db, "What are my intents?");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.toLowerCase()).toMatch(/intent|co-founder|rust|list|have|your/);
    }, 60000);
  });

  describe("Index-scoped, member, no intents in index", () => {
    test("What are my intents here? → empty or no intents in this index", async () => {
      const db = createChatGraphMockDb({
        getIndex: (id) => (id === testIndexId ? { id: testIndexId, title: "Test Index" } : null),
        isNetworkMember: (id, uid) => id === testIndexId && uid === testUserId,
        isIndexOwner: () => false,
        intentsInIndexForMember: () => [],
      });
      const result = await runInvokeScenario(
        db,
        "What are my intents here?",
        { networkId: testIndexId }
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
    }, 60000);
  });

  describe("Index-scoped, member, has intents in index", () => {
    test("What are my intents here? → lists intents in this index", async () => {
      const intentsInIndex = [
        mockActiveIntent({ id: "ix-1", payload: "Looking for a mentor in AI" }),
      ];
      const db = createChatGraphMockDb({
        getIndex: (id) => (id === testIndexId ? { id: testIndexId, title: "AI Network" } : null),
        isNetworkMember: (id, uid) => id === testIndexId && uid === testUserId,
        isIndexOwner: () => false,
        intentsInIndexForMember: (uid, networkId) =>
          networkId === testIndexId && uid === testUserId ? intentsInIndex : [],
      });
      const result = await runInvokeScenario(
        db,
        "What are my intents in this index?",
        { networkId: testIndexId }
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.toLowerCase()).toMatch(/intent|mentor|ai|list|have|your/);
    }, 60000);
  });

  describe("Index-scoped, owner, all intents in index", () => {
    test("Show all intents in this index → owner sees everyone's intents", async () => {
      const allIntents = [
        mockIndexedIntent({ id: "a1", payload: "Alice: Looking for co-founder", userId: "u1", userName: "Alice" }),
        mockIndexedIntent({ id: "b1", payload: "Bob: Seeking mentor", userId: "u2", userName: "Bob" }),
      ];
      const db = createChatGraphMockDb({
        getIndex: (id) => (id === testIndexId ? { id: testIndexId, title: "Founders" } : null),
        isNetworkMember: (id, uid) => id === testIndexId && uid === testUserId,
        isIndexOwner: (id, uid) => id === testIndexId && uid === testUserId,
        indexIntentsForOwner: (networkId, _req) =>
          networkId === testIndexId ? allIntents : [],
      });
      const result = await runInvokeScenario(
        db,
        "Show all intents in this index. Everyone's intents.",
        { networkId: testIndexId }
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.toLowerCase()).toMatch(/intent|alice|bob|co-founder|mentor|list|all/);
    }, 60000);
  });

  describe("Index-scoped, not a member", () => {
    test("What are my intents here? → index not found or not a member", async () => {
      const db = createChatGraphMockDb({
        getIndex: (id) => (id === testIndexId ? { id: testIndexId, title: "Private" } : null),
        isNetworkMember: () => false,
        isIndexOwner: () => false,
      });
      const result = await runInvokeScenario(
        db,
        "What are my intents here?",
        { networkId: testIndexId }
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string; error?: string };
      expect(output.responseText).toBeDefined();
      const message = [output.responseText, output.error].filter(Boolean).join(" ").toLowerCase();
      expect(message.match(/not a member|index not found|join|see your indexes/)).toBeTruthy();
    }, 60000);
  });
});
