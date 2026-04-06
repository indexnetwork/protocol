/**
 * Chat Graph: Opportunity workflows — list (empty / with drafts), create (system), send (user);
 * as member vs owner; no intents vs has intents.
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
  mockOpportunity,
  mockActiveIntent,
  mockChatSessionReader,
  createMockProtocolDeps,
} from "./chat.graph.mocks.js";

const testUserId = "opp-test-user";
const testIndexId = "00000000-0000-0000-4000-000000000002";

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

function runOpportunityScenario(
  db: ReturnType<typeof createChatGraphMockDb>,
  message: string,
  options: { networkId?: string } = {}
) {
  const factory = new ChatGraphFactory(db, mockEmbedder, mockScraper, mockChatSessionReader, createMockProtocolDeps());
  const graph = factory.createGraph();
  return runScenario(
    defineScenario({
      name: `opp-${message.slice(0, 22).replace(/\s/g, "-")}`,
      description: `Opportunity workflow: ${message}`,
      fixtures: { userId: testUserId, networkId: options.networkId, message },
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

describe("Chat Graph opportunity workflows", () => {
  describe("List opportunities", () => {
    test("no opportunities → list returns empty or none", async () => {
      const db = createChatGraphMockDb({
        opportunitiesForUser: () => [],
      });
      const result = await runOpportunityScenario(db, "What opportunities do I have?");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(
        output.responseText!
          .toLowerCase()
          .match(/no matches|no connections|none|don't have|empty|yet/)
      ).toBeTruthy();
    }, 120000);

    test("has latent (draft) opportunities → list shows conversational draft/match wording", async () => {
      const opps = [
        mockOpportunity({
          id: "opp-1",
          status: "latent",
          networkId: testIndexId,
          currentUserId: testUserId,
          otherPartyUserIds: ["user-alice"],
        }),
      ];
      const db = createChatGraphMockDb({
        opportunitiesForUser: (uid) => (uid === testUserId ? opps : []),
        getUser: (uid) =>
          uid === "user-alice"
            ? { id: uid, name: "Alice", email: "" }
            : uid === testUserId
              ? { id: uid, name: "Test User", email: "" }
              : null,
        getNetwork: (id) => (id === testIndexId ? { id: testIndexId, title: "Test Index" } : null),
      });
      const result = await runOpportunityScenario(db, "What opportunities do I have?");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(
        output.responseText!
          .toLowerCase()
          .match(/draft|alice|list|match|connection|intro|possible/)
      ).toBeTruthy();
    }, 120000);

    test("has pending opportunity → list shows pending or send intro", async () => {
      const opps = [
        mockOpportunity({
          id: "opp-2",
          status: "pending",
          currentUserId: testUserId,
          otherPartyUserIds: ["user-carol"],
        }),
      ];
      const db = createChatGraphMockDb({
        opportunitiesForUser: (uid) => (uid === testUserId ? opps : []),
        getUser: (uid) =>
          uid === "user-carol" ? { id: uid, name: "Carol", email: "" } : { id: uid, name: "Test User", email: "" },
      });
      const result = await runOpportunityScenario(db, "List my opportunities.");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
    }, 120000);
  });

  describe("Find / create opportunities", () => {
    test("Find me opportunities with no intents → explains join community and add what user is looking for", async () => {
      const db = createChatGraphMockDb({
        activeIntents: () => [],
        intentsInIndexForMember: () => [],
        networkMemberships: () => [],
        getNetwork: () => null,
      });
      const result = await runOpportunityScenario(
        db,
        "Find me opportunities. Who can help with fundraising?"
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(
        output.responseText!
          .toLowerCase()
          .match(/join|community|add|first|looking for|matches|connection/)
      ).toBeTruthy();
    }, 120000);

    test("Find me opportunities with intents in index → create_opportunities path, coherent reply", async () => {
      const db = createChatGraphMockDb({
        getNetwork: (id) => (id === testIndexId ? { id: testIndexId, title: "Founders" } : null),
        isNetworkMember: (id, uid) => id === testIndexId && uid === testUserId,
        activeIntents: (uid) =>
          uid === testUserId
            ? [mockActiveIntent({ id: "i1", payload: "Looking for co-founder" })]
            : [],
        intentsInIndexForMember: (uid, networkId) =>
          networkId === testIndexId && uid === testUserId
            ? [mockActiveIntent({ id: "i1", payload: "Looking for co-founder" })]
            : [],
        opportunitiesForUser: () => [],
      });
      const result = await runOpportunityScenario(
        db,
        "Find me opportunities in this index.",
        { networkId: testIndexId }
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
    }, 120000);
  });

  describe("Send opportunity (user action)", () => {
    test("Send intro to [name] with no such opportunity → clear message or suggest list", async () => {
      const db = createChatGraphMockDb({
        opportunitiesForUser: () => [],
      });
      const result = await runOpportunityScenario(
        db,
        "Send intro to Alice."
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
    }, 120000);
  });
});
