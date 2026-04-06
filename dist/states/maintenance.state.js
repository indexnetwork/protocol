import { Annotation } from '@langchain/langgraph';
/**
 * Maintenance Graph State (Annotation-based).
 * Flow: loadCurrentFeed → scoreFeedHealth → [conditional: rediscover | END] → logMaintenance → END
 */
export const MaintenanceGraphState = Annotation.Root({
    userId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => '',
    }),
    /** Active intents for the user (used for rediscovery). */
    activeIntents: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Current actionable opportunities for the user. */
    currentOpportunities: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Current expired opportunities count. */
    expiredCount: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 0,
    }),
    /** Unix ms timestamp of last rediscovery for this user. */
    lastRediscoveryAt: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => null,
    }),
    /** Feed health score result. */
    healthResult: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => null,
    }),
    /** Number of rediscovery jobs enqueued. */
    rediscoveryJobsEnqueued: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 0,
    }),
    /** Current connector-flow opportunity count (from scoreFeedHealth). */
    connectorFlowCount: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 0,
    }),
    /** Number of introducer discovery jobs enqueued. */
    introducerDiscoveryJobsEnqueued: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 0,
    }),
    error: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
});
//# sourceMappingURL=maintenance.state.js.map