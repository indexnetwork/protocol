/** Input for computing feed health score. */
export interface FeedHealthInput {
    connectionCount: number;
    connectorFlowCount: number;
    expiredCount: number;
    totalActionable: number;
    /** Unix ms timestamp of last rediscovery, or null if never. */
    lastRediscoveryAt: number | null;
    /** Window in ms over which freshness decays from 1 → 0 (e.g. 12h). */
    freshnessWindowMs: number;
    /** Score threshold below which shouldMaintain is true. Default 0.5. */
    threshold?: number;
}
/** Output of feed health computation. */
export interface FeedHealthResult {
    score: number;
    breakdown: {
        composition: number;
        freshness: number;
        expirationRatio: number;
    };
    shouldMaintain: boolean;
}
/**
 * Compute feed health score (0–1) from current feed state.
 * Pure function, no side effects.
 *
 * @param input - Current feed composition and timing data
 * @returns Health score with breakdown and maintenance recommendation
 */
export declare function computeFeedHealth(input: FeedHealthInput): FeedHealthResult;
//# sourceMappingURL=feed.health.d.ts.map