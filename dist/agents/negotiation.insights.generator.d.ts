/**
 * Negotiation Insights Generator
 *
 * Produces an aggregated, second-person narrative summarizing a user's
 * negotiation history — topics they're sought for, role patterns,
 * opportunity trends, and interesting signals from recent activity.
 */
/** Compressed digest of a user's negotiation history for the LLM. */
export interface NegotiationDigest {
    totalCount: number;
    opportunityCount: number;
    noOpportunityCount: number;
    inProgressCount: number;
    roleDistribution: Record<string, number>;
    counterparties: string[];
    reasoningExcerpts: string[];
}
/**
 * Generates an aggregated insight summary from a user's negotiation history.
 * @remarks Lightweight single-call agent; no DB access, no side effects.
 */
export declare class NegotiationInsightsGenerator {
    private model;
    constructor();
    /**
     * Produces a narrative summary from a negotiation digest.
     * @param digest - Pre-computed statistics and excerpts from the user's negotiations
     * @returns A 2-4 sentence insight paragraph, or null on failure
     */
    invoke(digest: NegotiationDigest): Promise<string | null>;
}
//# sourceMappingURL=negotiation.insights.generator.d.ts.map