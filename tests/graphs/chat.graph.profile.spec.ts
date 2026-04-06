/**
 * Chat Graph: Profile workflows — no profile / has profile × read / create / update.
 * Uses configurable mock data; schema + optional LLM verification.
 */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, test, expect } from "bun:test";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { runScenario, defineScenario, expectSmartest } from "../../smartest.js";
import { ChatGraphFactory } from "../../src/graphs/chat.graph.js";
import type { Embedder } from "../../src/interfaces/embedder.interface.js";
import type { Scraper } from "../../src/interfaces/scraper.interface.js";
import { createChatGraphMockDb, mockProfile, mockChatSessionReader, createMockProtocolDeps } from "./chat.graph.mocks.js";

const testUserId = "profile-test-user";

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

function runProfileScenario(
  db: ReturnType<typeof createChatGraphMockDb>,
  message: string
) {
  const factory = new ChatGraphFactory(db, mockEmbedder, mockScraper, mockChatSessionReader, createMockProtocolDeps());
  const graph = factory.createGraph();
  return runScenario(
    defineScenario({
      name: `profile-${message.slice(0, 25).replace(/\s/g, "-")}`,
      description: `Profile workflow: ${message}`,
      fixtures: { userId: testUserId, message },
      sut: {
        type: "graph",
        factory: () => graph,
        invoke: async (instance: unknown, resolvedInput: unknown) => {
          const input = resolvedInput as { userId: string; message: string };
          return await (
            instance as ReturnType<ChatGraphFactory["createGraph"]>
          ).invoke({
            userId: input.userId,
            messages: [new HumanMessage(input.message)],
          });
        },
        input: { userId: "@fixtures.userId", message: "@fixtures.message" },
      },
      verification: {
        schema: chatGraphOutputSchema,
        criteria: "Response must be coherent and not contain raw JSON.",
        llmVerify: false,
      },
    })
  );
}

describe("Chat Graph profile workflows", () => {
  describe("No profile", () => {
    test("What's my profile? → no profile or suggest creating one", async () => {
      const db = createChatGraphMockDb({ profile: null });
      const result = await runProfileScenario(db, "What's my profile? Do I have a profile?");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(
        output.responseText!.toLowerCase().match(/no profile|don't have|create|would you like/)
      ).toBeTruthy();
    }, 60000);

    test("Update my profile: add Python → suggests creating profile first", async () => {
      const db = createChatGraphMockDb({ profile: null });
      const result = await runProfileScenario(db, "Update my profile: add Python to skills.");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(
        output.responseText!.toLowerCase().match(/no profile|don't have|create first|create one/)
      ).toBeTruthy();
    }, 60000);
  });

  describe("Has profile", () => {
    test("What's my profile? → returns name/bio/skills in natural language", async () => {
      const profile = mockProfile({ userId: testUserId, name: "Jane Dev" });
      const db = createChatGraphMockDb({ profile });
      const result = await runProfileScenario(db, "What's my profile?");
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      expect(output.responseText!.toLowerCase()).toMatch(/jane|profile|typescript|skill|bio/);
    }, 60000);

    test("Create my profile (already have one) → acknowledges profile or suggests update", async () => {
      const profile = mockProfile({ userId: testUserId });
      const db = createChatGraphMockDb({ profile });
      const result = await runProfileScenario(
        db,
        "Create my profile. I'm Jane, a developer in NYC."
      );
      expectSmartest(result);
      const output = result.output as { responseText?: string };
      expect(output.responseText).toBeDefined();
      // Agent may suggest updating, mention the existing profile, or proceed with regeneration
      expect(
        output.responseText!.toLowerCase().match(/already|update|existing|profile|created|generated|regenerat/)
      ).toBeTruthy();
    }, 60000);
  });
});
