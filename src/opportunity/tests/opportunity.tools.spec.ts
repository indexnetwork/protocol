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

import { resolveActionableLinkKind, buildOpportunityPresentation, attachActionableLinks, buildProfileUrl } from "../opportunity.tools.js";

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
    expect(resolveActionableLinkKind({ status: "expired", viewerRole: "introducer", viewerApproved: false })).toBeNull();
  });

  test("latent + introducer + unapproved → approve_introduction (connector-flow before approval)", () => {
    expect(
      resolveActionableLinkKind({ status: "latent", viewerRole: "introducer", viewerApproved: false }),
    ).toBe("approve_introduction");
    // undefined defaults match "unapproved" — same as draft.
    expect(
      resolveActionableLinkKind({ status: "latent", viewerRole: "introducer" }),
    ).toBe("approve_introduction");
  });

  test("latent + introducer + approved → null (negotiation in flight)", () => {
    expect(
      resolveActionableLinkKind({ status: "latent", viewerRole: "introducer", viewerApproved: true }),
    ).toBeNull();
  });

  test("latent + non-introducer → null (chat surface filters this case out anyway)", () => {
    expect(resolveActionableLinkKind({ status: "latent", viewerRole: "party" })).toBeNull();
    expect(resolveActionableLinkKind({ status: "latent", viewerRole: "agent" })).toBeNull();
    expect(resolveActionableLinkKind({ status: "latent", viewerRole: "patient" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// attachActionableLinks — mutation and resilience
// ---------------------------------------------------------------------------

type TestCard = Record<string, unknown> & {
  opportunityId: string;
  viewerRole: string;
  status: string;
};

function makeCard(
  overrides: Partial<TestCard> & { opportunityId: string; viewerRole: string; status: string },
): TestCard {
  return { name: "Counterpart", ...overrides };
}

function makeMintSpy(url = "https://api.test/c/AAAAAAAAAA") {
  const calls: Array<{ userId: string; opportunityId: string; kind: string; greeting?: string | null }> = [];
  const mintConnectLink = async (args: { userId: string; opportunityId: string; kind: string; greeting?: string | null }) => {
    calls.push(args);
    return { url };
  };
  return { mintConnectLink, calls };
}

describe("attachActionableLinks — mutation and resilience", () => {
  test("pending + party → mints connect, attaches all fields", async () => {
    const card = makeCard({ opportunityId: "opp-1", viewerRole: "party", status: "pending" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-1",
      counterpartUser: { socials: [{ label: "telegram", value: "alice" }] },
      counterpartUserId: "counterpart-1",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(1);
    expect(calls[0]).toMatchObject({ userId: "user-1", opportunityId: "opp-1", kind: "connect", greeting: null });
    expect(card.acceptUrl).toBe("https://api.test/c/AAAAAAAAAA");
    expect(card.profileUrl).toBe("https://t.me/alice");
    expect(card.feedCategory).toBe("connection");
  });

  test("accepted + party → mints outreach, feedCategory=connection", async () => {
    const card = makeCard({ opportunityId: "opp-2", viewerRole: "party", status: "accepted" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-2",
      counterpartUser: null,
      counterpartUserId: "counterpart-2",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(1);
    expect(calls[0].kind).toBe("outreach");
    expect(card.feedCategory).toBe("connection");
  });

  test("draft + introducer + viewerApproved=false → mints approve_introduction, feedCategory=connector-flow", async () => {
    const card = makeCard({ opportunityId: "opp-3", viewerRole: "introducer", status: "draft" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-3",
      viewerApproved: false,
      counterpartUser: null,
      counterpartUserId: "counterpart-3",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(1);
    expect(calls[0].kind).toBe("approve_introduction");
    expect(card.feedCategory).toBe("connector-flow");
  });

  test("draft + introducer + viewerApproved=true → no mint, card unchanged", async () => {
    const card = makeCard({ opportunityId: "opp-4", viewerRole: "introducer", status: "draft" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-4",
      viewerApproved: true,
      counterpartUser: null,
      counterpartUserId: "counterpart-4",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(0);
    expect(card.acceptUrl).toBeUndefined();
    expect(card.profileUrl).toBeUndefined();
    expect(card.feedCategory).toBeUndefined();
  });

  test("draft + party (sender) → no mint, card unchanged", async () => {
    const card = makeCard({ opportunityId: "opp-5", viewerRole: "party", status: "draft" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-5",
      counterpartUser: null,
      counterpartUserId: "counterpart-5",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(0);
    expect(card.acceptUrl).toBeUndefined();
    expect(card.profileUrl).toBeUndefined();
    expect(card.feedCategory).toBeUndefined();
  });

  test("pending + introducer → no mint, card unchanged", async () => {
    const card = makeCard({ opportunityId: "opp-6", viewerRole: "introducer", status: "pending" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-6",
      counterpartUser: null,
      counterpartUserId: "counterpart-6",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(0);
    expect(card.acceptUrl).toBeUndefined();
  });

  test("accepted + introducer → no mint, card unchanged", async () => {
    const card = makeCard({ opportunityId: "opp-7", viewerRole: "introducer", status: "accepted" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-7",
      counterpartUser: null,
      counterpartUserId: "counterpart-7",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(0);
    expect(card.acceptUrl).toBeUndefined();
  });

  test("rejected (any role) → no mint, card unchanged", async () => {
    const card = makeCard({ opportunityId: "opp-8", viewerRole: "party", status: "rejected" });
    const { mintConnectLink, calls } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-8",
      counterpartUser: null,
      counterpartUserId: "counterpart-8",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(calls.length).toBe(0);
    expect(card.acceptUrl).toBeUndefined();
  });

  test("profileUrl falls back to web URL when no Telegram social", async () => {
    const card = makeCard({ opportunityId: "opp-9", viewerRole: "party", status: "pending" });
    const { mintConnectLink } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-9",
      counterpartUser: { socials: [] },
      counterpartUserId: "counterpart-9",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(card.profileUrl).toBe(`https://app.test/u/counterpart-9?link_preview=false`);
  });

  test("profileUrl is undefined when no Telegram AND no frontendUrl", async () => {
    const card = makeCard({ opportunityId: "opp-10", viewerRole: "party", status: "pending" });
    const { mintConnectLink } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-10",
      counterpartUser: { socials: [] },
      counterpartUserId: "counterpart-10",
      mintConnectLink,
      frontendUrl: undefined,
    });
    expect("profileUrl" in card).toBe(false);
    expect(card.acceptUrl).toBe("https://api.test/c/AAAAAAAAAA");
    expect(card.feedCategory).toBe("connection");
  });

  test("mint error is swallowed; card has no acceptUrl/profileUrl/feedCategory", async () => {
    const card = makeCard({ opportunityId: "opp-11", viewerRole: "party", status: "pending" });
    const mintConnectLink = async (_args: { userId: string; opportunityId: string; kind: string; greeting?: string | null }) => {
      throw new Error("DB down");
    };
    await expect(
      attachActionableLinks(card, {
        viewerId: "user-11",
        counterpartUser: null,
        counterpartUserId: "counterpart-11",
        mintConnectLink,
        frontendUrl: "https://app.test",
      }),
    ).resolves.toBeUndefined();
    expect(card.acceptUrl).toBeUndefined();
    expect(card.profileUrl).toBeUndefined();
    expect(card.feedCategory).toBeUndefined();
  });

  test("Telegram handle strips leading @", async () => {
    const card = makeCard({ opportunityId: "opp-12", viewerRole: "party", status: "pending" });
    const { mintConnectLink } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-12",
      counterpartUser: { socials: [{ label: "telegram", value: "@bobby" }] },
      counterpartUserId: "counterpart-12",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(card.profileUrl).toBe("https://t.me/bobby");
  });

  test("Telegram label match is case-insensitive", async () => {
    const card = makeCard({ opportunityId: "opp-13", viewerRole: "party", status: "pending" });
    const { mintConnectLink } = makeMintSpy();
    await attachActionableLinks(card, {
      viewerId: "user-13",
      counterpartUser: { socials: [{ label: "Telegram", value: "carol" }] },
      counterpartUserId: "counterpart-13",
      mintConnectLink,
      frontendUrl: "https://app.test",
    });
    expect(card.profileUrl).toBe("https://t.me/carol");
  });
});

// ---------------------------------------------------------------------------
// buildProfileUrl — edge cases
// ---------------------------------------------------------------------------

describe("buildProfileUrl — edge cases", () => {
  test("whitespace in Telegram value is trimmed", () => {
    const result = buildProfileUrl(
      { socials: [{ label: "telegram", value: "  danny  " }] },
      "user-dan",
      "https://app.test",
    );
    expect(result).toBe("https://t.me/danny");
  });

  test("socials is null → falls through to frontendUrl", () => {
    const result = buildProfileUrl(
      { socials: null },
      "user-null",
      "https://app.test",
    );
    expect(result).toBe("https://app.test/u/user-null?link_preview=false");
  });

  test("counterpartUser itself is null → falls through to frontendUrl", () => {
    const result = buildProfileUrl(null, "user-none", "https://app.test");
    expect(result).toBe("https://app.test/u/user-none?link_preview=false");
  });

  test("no Telegram and no frontendUrl → returns undefined", () => {
    const result = buildProfileUrl({ socials: [] }, "user-undef", undefined);
    expect(result).toBeUndefined();
  });

  test("Telegram value is empty string → falls through to frontendUrl", () => {
    const result = buildProfileUrl(
      { socials: [{ label: "telegram", value: "" }] },
      "user-empty",
      "https://app.test",
    );
    expect(result).toBe("https://app.test/u/user-empty?link_preview=false");
  });

  test("URL-like Telegram value is safely normalized (strips URL prefix + query params)", () => {
    // normalizeTelegramHandle strips the t.me/ prefix and query params, leaving
    // the bare handle. This is safer than the old code that interpolated the raw value.
    expect(
      buildProfileUrl(
        { socials: [{ label: "telegram", value: "t.me/alice?evil=1" }] },
        "user-z",
        "https://app.test",
      ),
    ).toBe("https://t.me/alice");
  });

  test("invalid Telegram handle (newline injected) falls back to frontend URL", () => {
    // Newlines break the regex validation — result is null, falls back to web URL.
    expect(
      buildProfileUrl(
        { socials: [{ label: "telegram", value: "alice\nevil" }] },
        "user-z",
        "https://app.test",
      ),
    ).toBe("https://app.test/u/user-z?link_preview=false");
  });

  test("Telegram handle below 5 chars falls back to frontend URL", () => {
    expect(
      buildProfileUrl(
        { socials: [{ label: "telegram", value: "bob" }] },
        "user-y",
        "https://app.test",
      ),
    ).toBe("https://app.test/u/user-y?link_preview=false");
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
