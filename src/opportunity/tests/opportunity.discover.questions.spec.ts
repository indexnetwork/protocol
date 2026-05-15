import { config } from "dotenv";
config({ path: ".env.test" });
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "test-key";

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { runDiscoverFromQuery, type DiscoverInput } from "../opportunity.discover.js";
import type { Question, ChatContextDigest, QuestionGeneratorReader, ChatSummaryReader } from "@indexnetwork/protocol";

const baseQuestion: Question = {
  title: "Stage",
  prompt: "Where are you in your journey?",
  options: [
    { label: "ideating", description: "" },
    { label: "shipping", description: "" },
  ],
  multiSelect: false,
};

function makeFakeGraph(opportunities: unknown[] = [], extras: Record<string, unknown> = {}) {
  return {
    invoke: async () => ({
      opportunities,
      remainingCandidates: [],
      trace: [],
      existingBetweenActors: [],
      dedupAlreadyAccepted: [],
      sourceProfile: null,
      discoveryNegotiations: extras.discoveryNegotiations ?? [],
      discoverySummary: extras.discoverySummary ?? {
        totalCandidates: 0,
        opportunitiesFound: 0,
        noOpportunityCount: 0,
        timeoutCount: 0,
        roleDistribution: {},
      },
      ...extras,
    }),
  } as unknown as DiscoverInput["opportunityGraph"];
}

function makeFakeDatabase(): DiscoverInput["database"] {
  return {
    getProfile: async () => null,
    getUser: async () => null,
    getOpportunity: async () => null,
    getOpportunitiesByIds: async () => [],
  } as unknown as DiscoverInput["database"];
}

const originalFlag = process.env.ENABLE_DISCOVERY_QUESTIONS;
beforeEach(() => { process.env.ENABLE_DISCOVERY_QUESTIONS = "true"; });
afterEach(() => { process.env.ENABLE_DISCOVERY_QUESTIONS = originalFlag; });

describe("runDiscoverFromQuery — decision-question integration", () => {
  it("returns questions when trigger=orchestrator and the generator yields a result", async () => {
    const chatSummary: ChatSummaryReader = { getDigest: async () => null };
    const questionGenerator: QuestionGeneratorReader = {
      generate: async () => ({ questions: [baseQuestion], strategies: ["refine_intent"] }),
    };
    const result = await runDiscoverFromQuery({
      opportunityGraph: makeFakeGraph(),
      database: makeFakeDatabase(),
      userId: "u-1",
      query: "find mentors",
      indexScope: ["i-1"],
      trigger: "orchestrator",
      chatSessionId: "s-1",
      enableQuestions: true,
      chatSummary,
      questionGenerator,
    });
    expect(result.questions).toEqual([baseQuestion]);
    expect(result.discoveryQuestionsDebug?.finalCount).toBe(1);
    expect(result.discoveryQuestionsDebug?.strategies).toEqual(["refine_intent"]);
  });

  it("does not call generator when trigger=ambient (even with flag on)", async () => {
    let called = 0;
    const questionGenerator: QuestionGeneratorReader = {
      generate: async () => { called += 1; return null; },
    };
    const result = await runDiscoverFromQuery({
      opportunityGraph: makeFakeGraph(),
      database: makeFakeDatabase(),
      userId: "u-1",
      query: "q",
      indexScope: ["i-1"],
      trigger: "ambient",
      enableQuestions: true,
      questionGenerator,
    });
    expect(called).toBe(0);
    expect(result.questions).toBeUndefined();
    expect(result.discoveryQuestionsDebug).toBeUndefined();
  });

  it("does not call generator when enableQuestions is false", async () => {
    let called = 0;
    const questionGenerator: QuestionGeneratorReader = {
      generate: async () => { called += 1; return null; },
    };
    await runDiscoverFromQuery({
      opportunityGraph: makeFakeGraph(),
      database: makeFakeDatabase(),
      userId: "u-1",
      query: "q",
      indexScope: ["i-1"],
      trigger: "orchestrator",
      enableQuestions: false,
      questionGenerator,
    });
    expect(called).toBe(0);
  });

  it("passes the chat-session digest when chatSummary returns one", async () => {
    const digest: ChatContextDigest = { statedFacts: ["pre-rev"], openQuestions: [], rejectionReasons: [], surfacedFindings: [] };
    let observedDigest: ChatContextDigest | undefined;
    const chatSummary: ChatSummaryReader = { getDigest: async () => digest };
    const questionGenerator: QuestionGeneratorReader = {
      generate: async (input) => { observedDigest = input.chatContext; return null; },
    };
    await runDiscoverFromQuery({
      opportunityGraph: makeFakeGraph(),
      database: makeFakeDatabase(),
      userId: "u-1",
      query: "q",
      indexScope: ["i-1"],
      trigger: "orchestrator",
      chatSessionId: "s-1",
      enableQuestions: true,
      chatSummary,
      questionGenerator,
    });
    expect(observedDigest).toEqual(digest);
  });

  it("survives a chatSummary failure and still runs the generator with undefined chatContext", async () => {
    const chatSummary: ChatSummaryReader = { getDigest: async () => { throw new Error("db down"); } };
    let observedDigest: ChatContextDigest | undefined = { statedFacts: [], openQuestions: [], rejectionReasons: [], surfacedFindings: [] };
    const questionGenerator: QuestionGeneratorReader = {
      generate: async (input) => { observedDigest = input.chatContext; return null; },
    };
    await runDiscoverFromQuery({
      opportunityGraph: makeFakeGraph(),
      database: makeFakeDatabase(),
      userId: "u-1",
      query: "q",
      indexScope: ["i-1"],
      trigger: "orchestrator",
      chatSessionId: "s-1",
      enableQuestions: true,
      chatSummary,
      questionGenerator,
    });
    expect(observedDigest).toBeUndefined();
  });

  it("returns no questions when the generator returns null", async () => {
    const questionGenerator: QuestionGeneratorReader = { generate: async () => null };
    const result = await runDiscoverFromQuery({
      opportunityGraph: makeFakeGraph(),
      database: makeFakeDatabase(),
      userId: "u-1",
      query: "q",
      indexScope: ["i-1"],
      trigger: "orchestrator",
      chatSessionId: "s-1",
      enableQuestions: true,
      questionGenerator,
    });
    expect(result.questions).toBeUndefined();
    expect(result.discoveryQuestionsDebug?.finalCount).toBe(0);
  });
});
