import { describe, it, expect } from "bun:test";

import {
  buildQuestionPrompt,
  type DiscoveryQuestionInput,
  type DiscoveryNegotiation,
} from "../question.prompt.js";
import type { ChatContextDigest } from "../../shared/schemas/chat-context.schema.js";

function makeNegotiation(overrides: Partial<DiscoveryNegotiation> = {}): DiscoveryNegotiation {
  return {
    counterpartyId: "u1",
    counterpartyHint: "Backend engineer in Berlin",
    indexContext: "Builders looking for co-founders",
    turns: [
      {
        action: "propose",
        reasoning: "Could be a fit; both backend-heavy",
        suggestedRoles: { ownUser: "peer", otherUser: "peer" },
      },
    ],
    outcome: {
      hasOpportunity: false,
      reasoning: "No clear stage alignment",
    },
    ...overrides,
  };
}

function makeInput(overrides: Partial<DiscoveryQuestionInput> = {}): DiscoveryQuestionInput {
  return {
    query: "I'm looking for a technical co-founder",
    sourceProfile: { name: "Alex" },
    negotiations: [makeNegotiation()],
    summary: {
      totalCandidates: 1,
      opportunitiesFound: 0,
      noOpportunityCount: 1,
      timeoutCount: 0,
      roleDistribution: { peer: 1 },
    },
    now: "2026-05-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildQuestionPrompt", () => {
  it("includes the query verbatim", () => {
    const out = buildQuestionPrompt(makeInput({ query: "find me a Rust mentor" }));
    expect(out).toContain("find me a Rust mentor");
  });

  it("includes the summary counters", () => {
    const out = buildQuestionPrompt(makeInput({
      summary: {
        totalCandidates: 5,
        opportunitiesFound: 2,
        noOpportunityCount: 3,
        timeoutCount: 1,
        roleDistribution: { peer: 3, agent: 1, patient: 1 },
      },
    }));
    expect(out).toContain("5 candidates evaluated");
    expect(out).toContain("2 opportunities found");
    expect(out).toContain("3 ended without opportunity");
    expect(out).toContain("1 hit turn-cap/timeout");
  });

  it("indicates absent chat context", () => {
    const out = buildQuestionPrompt(makeInput({ chatContext: undefined }));
    expect(out).toContain("(no chat context available)");
  });

  it("renders chat-context fields when present", () => {
    const chatContext: ChatContextDigest = {
      statedFacts: ["Pre-revenue", "Based in Berlin"],
      openQuestions: ["What stage?"],
      rejectionReasons: ["All US-based candidates"],
      surfacedFindings: ["Two candidates mentioned the same VC"],
    };
    const out = buildQuestionPrompt(makeInput({ chatContext }));
    expect(out).toContain("Pre-revenue");
    expect(out).toContain("What stage?");
    expect(out).toContain("All US-based candidates");
    expect(out).toContain("Two candidates mentioned the same VC");
  });

  it("includes the now timestamp", () => {
    const out = buildQuestionPrompt(makeInput({ now: "2026-12-25T00:00:00.000Z" }));
    expect(out).toContain("2026-12-25T00:00:00.000Z");
  });

  it("truncates per-turn reasoning to 200 chars", () => {
    const longReasoning = "x".repeat(500);
    const neg = makeNegotiation({
      turns: [{
        action: "propose",
        reasoning: longReasoning,
        suggestedRoles: { ownUser: "peer", otherUser: "peer" },
      }],
    });
    const out = buildQuestionPrompt(makeInput({ negotiations: [neg] }));
    expect(out).toContain("x".repeat(200));
    expect(out).not.toContain("x".repeat(201));
  });

  it("truncates outcome.reasoning to 300 chars", () => {
    const longReasoning = "y".repeat(500);
    const neg = makeNegotiation({
      outcome: { hasOpportunity: false, reasoning: longReasoning },
    });
    const out = buildQuestionPrompt(makeInput({ negotiations: [neg] }));
    expect(out).toContain("y".repeat(300));
    expect(out).not.toContain("y".repeat(301));
  });

  it("keeps only the last 6 turns per negotiation", () => {
    const turns = Array.from({ length: 10 }, (_, i) => ({
      action: "propose" as const,
      reasoning: `turn-${i}`,
      suggestedRoles: { ownUser: "peer" as const, otherUser: "peer" as const },
    }));
    const out = buildQuestionPrompt(makeInput({ negotiations: [makeNegotiation({ turns })] }));
    // First 4 turns dropped; last 6 retained.
    expect(out).not.toContain("turn-0");
    expect(out).not.toContain("turn-3");
    expect(out).toContain("turn-4");
    expect(out).toContain("turn-9");
  });

  it("caps the number of negotiations at 8, sorting by [turns desc, seedAssessmentScore desc]", () => {
    // 10 negotiations, distinguishable by counterpartyHint.
    // The two with the FEWEST turns and lowest scores should be dropped.
    const negotiations: DiscoveryNegotiation[] = Array.from({ length: 10 }, (_, i) => makeNegotiation({
      counterpartyHint: `cp-${i}`,
      // i=0..7 get many turns; i=8,9 get one turn — they should be dropped.
      turns: Array.from({ length: i < 8 ? 5 : 1 }, () => ({
        action: "propose" as const,
        reasoning: `t-${i}`,
        suggestedRoles: { ownUser: "peer" as const, otherUser: "peer" as const },
      })),
      seedAssessmentScore: 1.0 - i * 0.1,
    }));
    const out = buildQuestionPrompt(makeInput({ negotiations }));
    for (let i = 0; i < 8; i++) {
      expect(out).toContain(`cp-${i}`);
    }
    expect(out).not.toContain("cp-8");
    expect(out).not.toContain("cp-9");
  });

  it("includes counterpartyHint and indexContext per negotiation", () => {
    const out = buildQuestionPrompt(makeInput({
      negotiations: [makeNegotiation({
        counterpartyHint: "AI infra founder, Berlin",
        indexContext: "Builders network",
      })],
    }));
    expect(out).toContain("AI infra founder, Berlin");
    expect(out).toContain("Builders network");
  });

  it("never includes counterpartyId", () => {
    const out = buildQuestionPrompt(makeInput({
      negotiations: [makeNegotiation({ counterpartyId: "user-abc123-secret" })],
    }));
    expect(out).not.toContain("user-abc123-secret");
  });
});
