import { FEED_SOFT_TARGETS } from './opportunity.utils';
const WEIGHT_COMPOSITION = 0.4;
const WEIGHT_FRESHNESS = 0.3;
const WEIGHT_EXPIRATION = 0.3;
const DEFAULT_THRESHOLD = 0.5;
/**
 * Compute composition sub-score: how close current counts are to soft targets.
 * Uses normalized distance: 1 - (|actual - target| / max(target, actual, 1)) per category,
 * then averages across categories.
 */
function scoreComposition(connectionCount, connectorFlowCount, expiredCount) {
    const categories = [
        { actual: connectionCount, target: FEED_SOFT_TARGETS.connection },
        { actual: connectorFlowCount, target: FEED_SOFT_TARGETS.connectorFlow },
        { actual: expiredCount, target: FEED_SOFT_TARGETS.expired },
    ];
    let totalScore = 0;
    for (const { actual, target } of categories) {
        const diff = Math.abs(actual - target);
        const denom = Math.max(target, actual, 1);
        totalScore += 1 - diff / denom;
    }
    return totalScore / categories.length;
}
/**
 * Compute freshness sub-score: linear decay from 1 → 0 over freshnessWindowMs.
 */
function scoreFreshness(lastRediscoveryAt, freshnessWindowMs) {
    if (lastRediscoveryAt == null)
        return 0;
    const elapsed = Date.now() - lastRediscoveryAt;
    if (elapsed <= 0)
        return 1;
    if (elapsed >= freshnessWindowMs)
        return 0;
    return 1 - elapsed / freshnessWindowMs;
}
/**
 * Compute expiration ratio sub-score: 1 - (expired / total).
 */
function scoreExpirationRatio(expiredCount, totalActionable) {
    const total = totalActionable + expiredCount;
    if (total === 0)
        return 0;
    return 1 - expiredCount / total;
}
/**
 * Compute feed health score (0–1) from current feed state.
 * Pure function, no side effects.
 *
 * @param input - Current feed composition and timing data
 * @returns Health score with breakdown and maintenance recommendation
 */
export function computeFeedHealth(input) {
    const { connectionCount, connectorFlowCount, expiredCount, totalActionable, lastRediscoveryAt, freshnessWindowMs, threshold = DEFAULT_THRESHOLD, } = input;
    // Empty feed is always unhealthy
    if (totalActionable === 0 && expiredCount === 0) {
        return {
            score: 0,
            breakdown: { composition: 0, freshness: 0, expirationRatio: 0 },
            shouldMaintain: true,
        };
    }
    const composition = scoreComposition(connectionCount, connectorFlowCount, expiredCount);
    const freshness = scoreFreshness(lastRediscoveryAt, freshnessWindowMs);
    const expirationRatio = scoreExpirationRatio(expiredCount, totalActionable);
    const score = WEIGHT_COMPOSITION * composition +
        WEIGHT_FRESHNESS * freshness +
        WEIGHT_EXPIRATION * expirationRatio;
    return {
        score,
        breakdown: { composition, freshness, expirationRatio },
        shouldMaintain: score < threshold,
    };
}
//# sourceMappingURL=feed.health.js.map