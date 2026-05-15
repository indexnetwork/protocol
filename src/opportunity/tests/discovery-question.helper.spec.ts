import { describe, it, expect } from "bun:test";
import { buildDiscoveryQuestionInput } from "../discovery-question.helper.js";
import type { ChatContextDigest } from "../../shared/schemas/chat-context.schema.js";
import type { DiscoveryNegotiation, DiscoverySummary } from "../question.prompt.js";

const negotiation: DiscoveryNegotiation = {
  counterpartyId: "u-1",
  counterpartyHint: "founder, NYC",
  indexContext: "ai-builders",
  turns: [
    { action: "propose", reasoning: "let's pair", suggestedRoles: { ownUser: "peer", otherUser: "peer" } },
  ],
  outcome: { hasOpportunity: false, reasoning: "no fit" },
};

const summary: DiscoverySummary = {
  totalCandidates: 1,
  opportunitiesFound: 0,
  noOpportunityCount: 1,
  timeoutCount: 0,
  roleDistribution: {},
};

describe("buildDiscoveryQuestionInput", () => {
  it("maps query, source profile, negotiations, summary, and timestamp", () => {
    const input = buildDiscoveryQuestionInput({
      query: "find AI cofounders",
      sourceProfile: {
        embedding: null,
        identity: { name: "Eda", bio: "engineer", location: "NYC" },
        attributes: { skills: ["ml"], interests: ["startups"] },
      },
      negotiations: [negotiation],
      summary,
      chatContext: undefined,
      now: "2026-05-15T12:00:00.000Z",
    });
    expect(input.query).toBe("find AI cofounders");
    expect(input.sourceProfile).toEqual({
      name: "Eda",
      bio: "engineer",
      location: "NYC",
      skills: ["ml"],
      interests: ["startups"],
    });
    expect(input.negotiations).toEqual([negotiation]);
    expect(input.summary).toEqual(summary);
    expect(input.now).toBe("2026-05-15T12:00:00.000Z");
    expect(input.chatContext).toBeUndefined();
  });

  it("forwards a provided chatContext digest verbatim", () => {
    const digest: ChatContextDigest = {
      statedFacts: ["pre-revenue"],
      openQuestions: [],
      rejectionReasons: [],
      surfacedFindings: [],
    };
    const input = buildDiscoveryQuestionInput({
      query: "q",
      sourceProfile: null,
      negotiations: [],
      summary,
      chatContext: digest,
      now: "2026-05-15T12:00:00.000Z",
    });
    expect(input.chatContext).toEqual(digest);
  });

  it("tolerates a null source profile", () => {
    const input = buildDiscoveryQuestionInput({
      query: "q",
      sourceProfile: null,
      negotiations: [],
      summary,
      chatContext: undefined,
      now: "2026-05-15T12:00:00.000Z",
    });
    expect(input.sourceProfile).toEqual({});
  });
});
