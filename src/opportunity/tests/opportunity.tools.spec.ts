import { config } from "dotenv";
config({ path: ".env.development", override: true });

import { describe, expect, it, test } from "bun:test";
import type { Opportunity } from "../../shared/interfaces/database.interface.js";
import { buildMinimalOpportunityCard } from "../opportunity.tools.js";

describe("buildMinimalOpportunityCard - IND-113", () => {
  const mockOpportunity = {
    id: "opp-123",
    status: "pending",
    interpretation: {
      reasoning:
        "Seref Yarar introduced you to Lucy Chen, who is actively seeking a product co-founder.",
      confidence: 0.85,
    },
    actors: [
      { userId: "viewer-456", role: "party" },
      { userId: "counterpart-789", role: "party" },
      { userId: "introducer-abc", role: "introducer" },
    ],
    detection: {
      source: "manual",
      createdByName: "Seref Yarar",
    },
  } as unknown as Opportunity;

  it("should not include introducer name in mainText when introducerName is passed", () => {
    const card = buildMinimalOpportunityCard(
      mockOpportunity,
      "viewer-456",
      "counterpart-789",
      "Lucy Chen",
      null,
      "Seref Yarar",
      null,
      undefined,
      undefined,
    );
    expect(card.mainText).not.toContain("Seref Yarar");
    expect(card.mainText).not.toContain("Seref");
    expect(card.mainText).toContain("Lucy Chen");
    expect(typeof card.mainText).toBe("string");
    expect(card.mainText.length).toBeGreaterThan(0);
  });

  it("should include counterpart name in mainText", () => {
    const card = buildMinimalOpportunityCard(
      mockOpportunity,
      "viewer-456",
      "counterpart-789",
      "Lucy Chen",
      null,
      "Seref Yarar",
      null,
      undefined,
      undefined,
    );
    expect(card.mainText).toContain("Lucy Chen");
  });

  it("should return safe card when interpretation or reasoning is missing", () => {
    const oppNoInterpretation = {
      id: "opp-no-interp",
      status: "pending",
      actors: [{ userId: "viewer-1", role: "party" }, { userId: "counterpart-1", role: "party" }],
      detection: { source: "manual" },
    } as unknown as Opportunity;
    const card = buildMinimalOpportunityCard(
      oppNoInterpretation,
      "viewer-1",
      "counterpart-1",
      "Alice",
      null,
      undefined,
      null,
      undefined,
      undefined,
    );
    expect(card).toBeDefined();
    expect(typeof card.mainText).toBe("string");
    expect(card.opportunityId).toBe("opp-no-interp");
    expect(card.name).toBe("Alice");
  });
});

describe('buildMinimalOpportunityCard - ghost user CTA (IND-161)', () => {
  const baseOpp = {
    id: 'opp-ghost',
    status: 'latent',
    interpretation: { reasoning: 'Strong match on AI interests.', confidence: 0.9 },
    actors: [
      { userId: 'viewer-1', role: 'party' },
      { userId: 'ghost-user', role: 'party' },
    ],
    detection: { source: 'opportunity_graph' },
  } as unknown as Opportunity;

  it('uses "Start Chat" as primaryActionLabel even when counterpart is a ghost user', () => {
    const card = buildMinimalOpportunityCard(
      baseOpp, 'viewer-1', 'ghost-user', 'Ghost User', null,
      undefined, null, undefined, undefined, undefined, undefined, true,
    );
    expect(card.primaryActionLabel).toBe('Start Chat');
    expect(card.isGhost).toBe(true);
  });

  it('uses "Start Chat" as primaryActionLabel when counterpart is not a ghost user', () => {
    const card = buildMinimalOpportunityCard(
      baseOpp, 'viewer-1', 'ghost-user', 'Real User', null,
      undefined, null, undefined, undefined, undefined, undefined, false,
    );
    expect(card.primaryActionLabel).toBe('Start Chat');
    expect(card.isGhost).toBe(false);
  });

  it('uses "Start Chat" as primaryActionLabel when isCounterpartGhost is not provided', () => {
    const card = buildMinimalOpportunityCard(
      baseOpp, 'viewer-1', 'ghost-user', 'Real User', null,
    );
    expect(card.primaryActionLabel).toBe('Start Chat');
    expect(card.isGhost).toBe(false);
  });

  it('uses "Good match" when viewer is the introducer, even for ghost counterpart', () => {
    const introOpp = {
      ...baseOpp,
      actors: [
        { userId: 'introducer-1', role: 'introducer' },
        { userId: 'ghost-user', role: 'party' },
        { userId: 'other-party', role: 'party' },
      ],
    } as unknown as Opportunity;
    const card = buildMinimalOpportunityCard(
      introOpp, 'introducer-1', 'ghost-user', 'Ghost User', null,
      undefined, null, undefined, undefined, undefined, undefined, true,
    );
    expect(card.primaryActionLabel).toBe('Good match');
  });
});

describe('buildMinimalOpportunityCard - introducer discovery (IND-140)', () => {
  const mockIntroducerOpp = {
    id: 'opp-intro-disc',
    status: 'draft',
    interpretation: {
      reasoning: 'Target User and Bob share interest in AI infrastructure.',
      confidence: 0.85,
    },
    actors: [
      { userId: 'target-user', role: 'patient' },
      { userId: 'user-bob', role: 'agent' },
      { userId: 'introducer-user', role: 'introducer' },
    ],
    detection: { source: 'manual', createdByName: 'Introducer Name' },
  } as unknown as Opportunity;

  it('should return viewerRole "introducer" when viewer is the introducer', () => {
    const card = buildMinimalOpportunityCard(
      mockIntroducerOpp,
      'introducer-user',
      'target-user',
      'Target User',
      null,
      undefined,
      null,
      'Introducer Name',
      'Bob',
    );
    expect(card.viewerRole).toBe('introducer');
    expect(card.primaryActionLabel).toBe('Good match');
    expect(card.headline).toBe('Target User → Bob');
  });
});

import { resolveActionableLinkKind, buildOpportunityPresentation } from "../opportunity.tools.js";

describe("resolveActionableLinkKind — actionability matrix", () => {
  test("accepted + non-introducer → outreach", () => {
    expect(resolveActionableLinkKind({ status: "accepted", viewerRole: "party" })).toBe("outreach");
    expect(resolveActionableLinkKind({ status: "accepted", viewerRole: "agent" })).toBe("outreach");
    expect(resolveActionableLinkKind({ status: "accepted", viewerRole: "patient" })).toBe("outreach");
    expect(resolveActionableLinkKind({ status: "accepted", viewerRole: "peer" })).toBe("outreach");
  });

  test("accepted + introducer → null", () => {
    expect(resolveActionableLinkKind({ status: "accepted", viewerRole: "introducer" })).toBeNull();
  });

  test("pending + non-introducer → connect", () => {
    expect(resolveActionableLinkKind({ status: "pending", viewerRole: "party" })).toBe("connect");
    expect(resolveActionableLinkKind({ status: "pending", viewerRole: "patient" })).toBe("connect");
    expect(resolveActionableLinkKind({ status: "pending", viewerRole: "agent" })).toBe("connect");
  });

  test("pending + introducer → null", () => {
    expect(resolveActionableLinkKind({ status: "pending", viewerRole: "introducer" })).toBeNull();
  });

  test("draft + introducer + unapproved → approve_introduction", () => {
    expect(
      resolveActionableLinkKind({ status: "draft", viewerRole: "introducer", viewerApproved: false }),
    ).toBe("approve_introduction");
    // undefined defaults to "unapproved" for fresh drafts coming from create_opportunities
    expect(
      resolveActionableLinkKind({ status: "draft", viewerRole: "introducer" }),
    ).toBe("approve_introduction");
  });

  test("draft + introducer + approved → null", () => {
    expect(
      resolveActionableLinkKind({ status: "draft", viewerRole: "introducer", viewerApproved: true }),
    ).toBeNull();
  });

  test("draft + non-introducer → null (sender needs update_opportunity)", () => {
    expect(resolveActionableLinkKind({ status: "draft", viewerRole: "party" })).toBeNull();
    expect(resolveActionableLinkKind({ status: "draft", viewerRole: "agent" })).toBeNull();
  });

  test("terminal / unknown statuses → null", () => {
    expect(resolveActionableLinkKind({ status: "rejected", viewerRole: "party" })).toBeNull();
    expect(resolveActionableLinkKind({ status: "latent", viewerRole: "party" })).toBeNull();
    expect(resolveActionableLinkKind({ status: "expired", viewerRole: "introducer", viewerApproved: false })).toBeNull();
  });
});

describe("buildOpportunityPresentation — MCP opportunityId omission", () => {
  test("omits opportunityId line when card has an acceptUrl", () => {
    const out = buildOpportunityPresentation(
      [{
        opportunityId: "opp-actionable-1",
        name: "Alice",
        mainText: "Both work on protocol design.",
        status: "pending",
        acceptUrl: "https://api.test/c/Abc1234567",
        profileUrl: "https://t.me/alice",
        feedCategory: "connection",
      }],
      { isMcp: true, leadIn: "Found 1 connection." },
    );

    expect(out).not.toContain("opportunityId: opp-actionable-1");
    expect(out).toContain("acceptUrl: https://api.test/c/Abc1234567");
    expect(out).not.toContain("Use opportunityId values only when calling update_opportunity");
  });

  test("keeps opportunityId line when card has NO acceptUrl (draft sender etc.)", () => {
    const out = buildOpportunityPresentation(
      [{
        opportunityId: "opp-draft-sender-1",
        name: "Bob",
        mainText: "You can offer DevOps mentorship.",
        status: "draft",
      }],
      { isMcp: true, leadIn: "Found 1 draft." },
    );

    expect(out).toContain("opportunityId: opp-draft-sender-1");
    expect(out).toContain("Use opportunityId values only when calling update_opportunity");
  });

  test("mixed actionability: keeps id only for non-actionable cards, keeps instruction", () => {
    const out = buildOpportunityPresentation(
      [
        { opportunityId: "opp-actionable", name: "Alice", status: "pending", acceptUrl: "https://api.test/c/Abc1234567" },
        { opportunityId: "opp-draft-sender", name: "Bob", status: "draft" },
      ],
      { isMcp: true, leadIn: "Found 2." },
    );

    expect(out).not.toContain("opportunityId: opp-actionable");
    expect(out).toContain("opportunityId: opp-draft-sender");
    expect(out).toContain("Use opportunityId values only when calling update_opportunity");
  });
});
