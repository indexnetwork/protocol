/**
 * Prompt module for the decision-question generator: the system prompt
 * constant, the `DiscoveryQuestionInput` contract, and a pure string-building
 * `buildQuestionPrompt` that assembles the user message.
 *
 * Pure: no I/O, no LLM call. The generator class (`question.generator.ts`)
 * orchestrates this module + an LLM client.
 */
import type { ChatContextDigest } from "../shared/schemas/chat-context.schema.js";

/** Roles used in the existing negotiation framework. */
export type NegotiationRole = "agent" | "patient" | "peer";

/** One turn within a negotiation. */
export interface DiscoveryTurn {
  action: "propose" | "accept" | "reject" | "counter" | "question";
  reasoning: string;
  suggestedRoles: { ownUser: NegotiationRole; otherUser: NegotiationRole };
}

/** Outcome of a negotiation. */
export interface DiscoveryOutcome {
  hasOpportunity: boolean;
  reasoning: string;
  agreedRoles?: Array<{ userId: string; role: NegotiationRole }>;
  /** Why the negotiation stopped, when not by an explicit accept/reject. */
  reason?: "turn_cap" | "timeout";
}

/** One negotiation that ran during this discovery turn. */
export interface DiscoveryNegotiation {
  /** Opaque counterparty identifier; NEVER surfaced to the user (kept out of the prompt). */
  counterpartyId: string;
  /** Abstract profile slice for the LLM (e.g. "AI infra founder, Berlin"). */
  counterpartyHint: string;
  /** The network/community prompt this negotiation ran under. */
  indexContext: string;
  /** Last 6 turns are retained; earlier ones are dropped. */
  turns: DiscoveryTurn[];
  outcome: DiscoveryOutcome;
  /**
   * Optional pre-negotiation evaluator score (0..1). When more than
   * `MAX_NEGOTIATIONS` candidates exist, this is used as a tie-breaker after
   * `turns.length` to decide which to keep.
   */
  seedAssessmentScore?: number;
}

/** Aggregate counters across all negotiations in this discovery turn. */
export interface DiscoverySummary {
  totalCandidates: number;
  opportunitiesFound: number;
  noOpportunityCount: number;
  /** Subset of `noOpportunityCount` where the negotiation hit a turn-cap or timeout. */
  timeoutCount: number;
  /** Map of role → count across all outcomes' `agreedRoles`. */
  roleDistribution: Partial<Record<NegotiationRole, number>>;
}

/** The seeker's profile slice the generator sees. All fields optional. */
export interface DiscoverySourceProfile {
  name?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  interests?: string[];
}

/** Full input to the question generator. */
export interface DiscoveryQuestionInput {
  /** The seeker's original natural-language query / signal that triggered discovery. */
  query: string;
  sourceProfile: DiscoverySourceProfile;
  /** Negotiations from THIS discovery turn (capped/sorted by the builder). */
  negotiations: DiscoveryNegotiation[];
  summary: DiscoverySummary;
  /** Distilled chat-session digest, when a session is in scope. */
  chatContext?: ChatContextDigest;
  /** ISO timestamp used as the "now" anchor in the prompt. */
  now: string;
}

/** Upper bound on negotiations included in the prompt; ~10 KB total prompt budget. */
const MAX_NEGOTIATIONS = 8;
/** Upper bound on turns included per negotiation (last N retained). */
const MAX_TURNS_PER_NEGOTIATION = 6;
/** Per-turn reasoning truncation. */
const MAX_TURN_REASONING_CHARS = 200;
/** Outcome reasoning truncation. */
const MAX_OUTCOME_REASONING_CHARS = 300;

export const SYSTEM_PROMPT = `You sit between a human and a discovery protocol that just ran negotiations on their behalf. Your job: surface the minimum set of structured decision questions the human must answer to make the next discovery turn sharper, or improve their outlook on the intent.

You may pick from five strategies. Choose contextually; mix when multiple questions genuinely complement.
- refine_intent: ask the user to sharpen or pivot their original signal.
- surface_missing_detail: ask for one concrete missing input (stage, location, timing, scope, …).
- open_adjacent_thread: offer a pivot suggested by recurring counterparty signals.
- reflective_summary: mirror what the negotiations revealed and ask the user to decide.
- surface_emergent_knowledge: cite a fact you learned from negotiations and ask the user to decide in light of it.

Ask a question only when ALL of these hold:
1. The agent cannot resolve the decision autonomously from the evidence shown.
2. The answer would materially change which candidates surface next.
3. The same fact is NOT already in chatContext.statedFacts, NOT already asked in chatContext.openQuestions, and NOT already shared in chatContext.surfacedFindings.

Cardinality. Default one question. Add a second only when a DIFFERENT strategy genuinely complements the first (e.g. one surface_emergent_knowledge + one refine_intent). Add a third only when there are ≥3 substantive candidates and three distinct strategies each unblock a real decision. Two questions of the same strategy are acceptable only if their decision domains differ (different titles). Avoid stacking three pulls (info-from-user); balance with pushes (info-to-user via reflective_summary / surface_emergent_knowledge).

Ordering. Questions whose answer unblocks the most failed negotiations come first; then highest-impact; then ambiguity-clarifying. Negotiations whose outcome.reason is "turn_cap" or "timeout" signal under-specification — prioritize.

Option construction. Each option must represent a meaningfully different outcome. Suffix the safest path with " (Recommended)" and list it first. The description states the CONSEQUENCE of choosing the option, not its definition. 2–4 options. Never add an "Other" option — clients provide a free-text fallback automatically. For surface_emergent_knowledge questions, anchor the prompt in the concrete cited fact ("Multiple candidates flagged that…") and let the options represent decisions in light of that fact, not different versions of the fact.

Title rules. ≤12 chars. Noun of the decision domain. Discovery examples: "Stage", "Timing", "Role", "Location", "Stack", "Budget", "Scope", "Format".

Anti-patterns — never do these.
- Don't ask procedural confirmations ("Should I look again?").
- Don't ask about hypothetical edge cases that didn't occur.
- Don't ask about specific candidate identities; treat counterpartyHint as the only allowed reference.
- Don't repeat anything in chatContext.openQuestions.
- Don't re-surface anything in chatContext.surfacedFindings.
- Don't ask for facts in chatContext.statedFacts.

Output. Return at most 3 entries in the "questions" array. Each entry must include a "strategy" field (one of the five values). If nothing is worth asking, return "questions": [].`;

/** Pure builder: assembles the user message string from a structured input. */
export function buildQuestionPrompt(input: DiscoveryQuestionInput): string {
  const profileSummary = renderProfile(input.sourceProfile);
  const negotiationBlocks = renderNegotiations(input.negotiations);
  const chatContextBlock = input.chatContext
    ? renderDigest(input.chatContext)
    : "(no chat context available)";
  const roleDistribution = renderRoleDistribution(input.summary.roleDistribution);

  return [
    "## Seeker's query",
    input.query,
    "",
    "## Seeker profile",
    profileSummary,
    "",
    "## This discovery turn",
    `- ${input.summary.totalCandidates} candidates evaluated`,
    `- ${input.summary.opportunitiesFound} opportunities found`,
    `- ${input.summary.noOpportunityCount} ended without opportunity (${input.summary.timeoutCount} hit turn-cap/timeout)`,
    `- Role distribution across outcomes: ${roleDistribution}`,
    "",
    "## Negotiation evidence",
    negotiationBlocks,
    "",
    "## What the user has already said in this session",
    chatContextBlock,
    "",
    "## Now",
    input.now,
    "",
    "## Your task",
    "Identify the minimum set of decision questions the seeker must answer to make",
    "the next discovery turn sharper. Apply every rule from your system prompt",
    "before outputting. Return an empty `questions` array if nothing is worth asking.",
  ].join("\n");
}

function renderProfile(p: DiscoverySourceProfile): string {
  const lines: string[] = [];
  if (p.name) lines.push(`Name: ${p.name}`);
  if (p.bio) lines.push(`Bio: ${p.bio}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  if (p.skills && p.skills.length > 0) lines.push(`Skills: ${p.skills.join(", ")}`);
  if (p.interests && p.interests.length > 0) lines.push(`Interests: ${p.interests.join(", ")}`);
  return lines.length > 0 ? lines.join("\n") : "(no profile data)";
}

function renderRoleDistribution(dist: Partial<Record<NegotiationRole, number>>): string {
  const entries = (Object.entries(dist) as Array<[NegotiationRole, number]>)
    .filter(([, n]) => n > 0);
  if (entries.length === 0) return "(none)";
  return entries.map(([role, n]) => `${role}=${n}`).join(", ");
}

function renderDigest(d: ChatContextDigest): string {
  const lines: string[] = [];
  if (d.statedFacts.length > 0) {
    lines.push("Stated facts:");
    for (const f of d.statedFacts) lines.push(`  - ${f}`);
  }
  if (d.openQuestions.length > 0) {
    lines.push("Open questions (assistant already asked):");
    for (const q of d.openQuestions) lines.push(`  - ${q}`);
  }
  if (d.rejectionReasons.length > 0) {
    lines.push("User pushback / rejections:");
    for (const r of d.rejectionReasons) lines.push(`  - ${r}`);
  }
  if (d.surfacedFindings.length > 0) {
    lines.push("Findings already surfaced to user:");
    for (const f of d.surfacedFindings) lines.push(`  - ${f}`);
  }
  return lines.length > 0 ? lines.join("\n") : "(digest is empty)";
}

function renderNegotiations(negotiations: DiscoveryNegotiation[]): string {
  if (negotiations.length === 0) return "(no negotiations)";
  const selected = selectNegotiations(negotiations).map(renderNegotiation);
  return selected.join("\n\n");
}

/** Sort + cap selection: top MAX_NEGOTIATIONS by [turns.length desc, seedAssessmentScore desc]. */
function selectNegotiations(negotiations: DiscoveryNegotiation[]): DiscoveryNegotiation[] {
  if (negotiations.length <= MAX_NEGOTIATIONS) return negotiations;
  return [...negotiations]
    .sort((a, b) => {
      if (b.turns.length !== a.turns.length) return b.turns.length - a.turns.length;
      const scoreDiff = (b.seedAssessmentScore ?? 0) - (a.seedAssessmentScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      // Stable final tiebreaker so the prompt is input-order-independent. The
      // counterparty id is opaque and never rendered; we use it only to break ties.
      return a.counterpartyId.localeCompare(b.counterpartyId);
    })
    .slice(0, MAX_NEGOTIATIONS);
}

function renderNegotiation(n: DiscoveryNegotiation): string {
  const lastTurns = n.turns.slice(-MAX_TURNS_PER_NEGOTIATION);
  const turnsRendered = lastTurns
    .map((t) => `    [${t.action}] (${t.suggestedRoles.ownUser}↔${t.suggestedRoles.otherUser}) ${truncate(t.reasoning, MAX_TURN_REASONING_CHARS)}`)
    .join("\n");
  const outcomeRole = n.outcome.hasOpportunity ? "opportunity" : "no-opportunity";
  const reasonSuffix = n.outcome.reason ? ` (${n.outcome.reason})` : "";
  return [
    `- Counterparty: ${n.counterpartyHint}`,
    `  Index: ${n.indexContext}`,
    `  Turns (last ${lastTurns.length} of ${n.turns.length}):`,
    turnsRendered,
    `  Outcome: ${outcomeRole}${reasonSuffix} — ${truncate(n.outcome.reasoning, MAX_OUTCOME_REASONING_CHARS)}`,
  ].join("\n");
}

/**
 * Truncate a string to `max` UTF-16 code units. Operates on `length`, not on
 * Unicode code points — a slice at an odd boundary in non-BMP text could split
 * a surrogate pair. Acceptable for v1: the inputs (negotiation reasoning, outcome
 * reasoning) are bounded prose that rarely contains emoji or astral-plane chars.
 * If that changes, switch to `Array.from(s).slice(0, max).join("")` for code-point
 * truncation at the cost of one extra allocation.
 */
function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}
