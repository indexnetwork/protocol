/**
 * Tests for introducer discovery card bugs:
 * - Bug 1: secondParty missing from FormattedDiscoveryCandidate in enrichOpportunities
 * - Bug 2: evaluator results not mapping back (tested indirectly via card data)
 * - Bug 3: duplicate candidates due to indexId in dedup key (tested at graph level)
 *
 * Hypothesis: The bug occurs because enrichOpportunities computes secondParty data
 * but never includes it in the returned FormattedDiscoveryCandidate object.
 */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, test, expect } from "bun:test";
import { runDiscoverFromQuery } from "../../src/support/opportunity.discover.js";
import type { FormattedDiscoveryCandidate } from "../../src/support/opportunity.discover.js";
import type { ChatGraphCompositeDatabase } from "../../src/interfaces/database.interface.js";

const mockDatabase: ChatGraphCompositeDatabase = {
  getProfile: async () => null,
  getUser: async () => null,
} as unknown as ChatGraphCompositeDatabase;

describe("introducer discovery cards - secondParty (Bug 1)", () => {
  const introducerId = "introducer-user";
  const targetId = "target-user";
  const candidateId = "candidate-match";

  const dbWithProfiles = {
    ...mockDatabase,
    getProfile: async (userId: string) => {
      if (userId === candidateId)
        return { identity: { name: "Bob Candidate", bio: "UX researcher." }, attributes: {}, narrative: {} };
      if (userId === targetId)
        return { identity: { name: "Alice Target", bio: "Product designer." }, attributes: {}, narrative: {} };
      return null;
    },
    getUser: async (userId: string) => {
      if (userId === introducerId)
        return { name: "Carol Introducer", avatar: "https://example.com/carol.jpg", onboarding: { completedAt: new Date() } };
      if (userId === targetId)
        return { name: "Alice Target", avatar: "https://example.com/alice.jpg", onboarding: { completedAt: new Date() } };
      if (userId === candidateId)
        return { name: "Bob Candidate", avatar: "https://example.com/bob.jpg", onboarding: { completedAt: new Date() } };
      return null;
    },
  } as unknown as ChatGraphCompositeDatabase;

  test("enriched introducer card includes secondParty with correct name and userId", async () => {
    const mockGraph = {
      invoke: async () => ({
        opportunities: [
          {
            id: "opp-intro-1",
            actors: [
              { indexId: "idx-1", userId: targetId, role: "patient" },
              { indexId: "idx-1", userId: candidateId, role: "agent" },
              { indexId: "idx-1", userId: introducerId, role: "introducer" },
            ],
            interpretation: {
              reasoning: "Bob and Alice share interest in AI.",
              confidence: 0.9,
            },
            detection: { source: "manual", createdBy: introducerId, timestamp: new Date().toISOString() },
            status: "draft",
          },
        ],
      }),
    };

    const result = await runDiscoverFromQuery({
      opportunityGraph: mockGraph as any,
      database: dbWithProfiles,
      userId: introducerId,
      query: "who should I connect Alice with?",
      indexScope: ["idx1"],
      onBehalfOfUserId: targetId,
      minimalForChat: true,
    });

    expect(result.found).toBe(true);
    expect(result.opportunities).toHaveLength(1);
    const card = result.opportunities![0];

    // The card's userId should be the candidate (Bob), NOT the intro target (Alice)
    expect(card.userId).toBe(candidateId);
    expect(card.name).toBe("Bob Candidate");

    // secondParty should contain the intro target's data
    expect(card.secondParty).toBeDefined();
    expect(card.secondParty!.name).toBe("Alice Target");
    expect(card.secondParty!.userId).toBe(targetId);
  });

  test("non-introducer cards do NOT include secondParty", async () => {
    const mockGraph = {
      invoke: async () => ({
        opportunities: [
          {
            id: "opp-standard",
            actors: [
              { indexId: "idx-1", userId: "u1", role: "patient" },
              { indexId: "idx-1", userId: candidateId, role: "agent" },
            ],
            interpretation: {
              reasoning: "Good match.",
              confidence: 0.85,
            },
            detection: { source: "opportunity_graph", createdBy: "agent", timestamp: new Date().toISOString() },
            status: "latent",
          },
        ],
      }),
    };

    const result = await runDiscoverFromQuery({
      opportunityGraph: mockGraph as any,
      database: {
        ...dbWithProfiles,
        getUser: async (userId: string) => {
          if (userId === candidateId)
            return { name: "Bob Candidate", avatar: null, onboarding: { completedAt: new Date() } };
          if (userId === "u1")
            return { name: "User One", avatar: null, onboarding: { completedAt: new Date() } };
          return null;
        },
      } as unknown as ChatGraphCompositeDatabase,
      userId: "u1",
      query: "find connections",
      indexScope: ["idx1"],
      minimalForChat: true,
    });

    expect(result.found).toBe(true);
    const card = result.opportunities![0];
    expect(card.secondParty).toBeUndefined();
  });
});
