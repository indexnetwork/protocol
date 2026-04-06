/**
 * Viewer-centric text for opportunity cards.
 * The card is shown to the viewer (logged-in user) and should introduce the
 * counterpart, not describe the viewer to themselves.
 */
/**
 * Returns viewer-centric main text for an opportunity card.
 * Prefers the part of the reasoning that describes the counterpart (the person
 * on the card), so the viewer sees an introduction to the counterpart rather
 * than a description of themselves.
 *
 * @param reasoning - Raw interpretation.reasoning (may describe both parties).
 * @param counterpartName - Display name of the suggested connection (e.g. "Alex Chen").
 * @param maxChars - Max length of returned string (default MINIMAL_MAIN_TEXT_MAX_CHARS).
 * @param viewerName - Optional display name of the viewer (signed-in user). When provided, sentences or prefixes describing the viewer are skipped so the card introduces the counterpart, not the viewer.
 * @param introducerName - Optional display name of the introducer. When provided, introducer phrases (e.g., "X introduced you to...") are stripped from the summary to keep the body text focused on match quality.
 * @returns Viewer-centric snippet mentioning the counterpart when possible; if counterpartName is empty, returns reasoning truncated to maxChars. Never null; may be "A suggested connection." when reasoning is empty.
 */
export declare function viewerCentricCardSummary(reasoning: string, counterpartName: string, maxChars?: number, viewerName?: string, introducerName?: string): string;
/**
 * Generates a short narrator remark from opportunity reasoning for the narrator chip.
 * Used by the minimal (no-LLM) card path so each card gets a unique remark
 * instead of the same static text.
 *
 * Extracts domain keywords (e.g. "AI", "design", "machine learning") from the
 * reasoning and frames them in a short template like "Shared interest in AI and design."
 *
 * This is a regex-based heuristic — an alternative is OpportunityPresenter.presentHomeCard()
 * which generates narratorRemark via LLM with much higher quality (already used by
 * home.graph.ts and opportunity.discover.ts). See buildMinimalOpportunityCard() in
 * opportunity.tools.ts for the trade-off discussion.
 *
 * @param reasoning - Raw interpretation.reasoning text.
 * @param counterpartName - Display name of the counterpart (stripped from output).
 * @param viewerName - Optional display name of the viewer (stripped from output).
 * @returns A short remark (max ~80 chars) suitable for the narrator chip. Never truncated with "...".
 */
export declare function narratorRemarkFromReasoning(reasoning: string, counterpartName: string, viewerName?: string): string;
//# sourceMappingURL=opportunity.card-text.d.ts.map