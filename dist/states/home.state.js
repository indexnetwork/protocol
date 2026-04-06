import { Annotation } from '@langchain/langgraph';
/**
 * Home Graph State (Annotation-based).
 * Flow: loadOpportunities → generateCardText → categorizeDynamically → normalizeAndSort → finalizeResponse.
 */
export const HomeGraphState = Annotation.Root({
    userId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => '',
    }),
    indexId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    limit: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 50,
    }),
    /** When true, bypass presenter and categorizer Redis caches. */
    noCache: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    /** Raw opportunities visible to the viewer (after visibility filter). */
    opportunities: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Cards with presenter output and narrator chip. */
    cards: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** LLM output: dynamic sections with icon and item indices. */
    sectionProposals: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Final sections for response. */
    sections: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Presenter results retrieved from cache (opportunityId → HomeCardItem). */
    cachedCards: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => new Map(),
    }),
    /** Opportunities that had no cache hit and need presenter generation. */
    uncachedOpportunities: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Whether categorizer results were found in cache. */
    categoryCacheHit: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    error: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** Meta for response (e.g. totalOpportunities, totalSections). */
    meta: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({ totalOpportunities: 0, totalSections: 0 }),
    }),
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: Annotation({
        reducer: (acc, val) => [...acc, ...val],
        default: () => [],
    }),
});
//# sourceMappingURL=home.state.js.map