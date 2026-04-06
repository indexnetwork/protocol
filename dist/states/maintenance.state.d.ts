import type { Opportunity } from '../interfaces/database.interface';
import type { FeedHealthResult } from '../support/feed.health';
/**
 * Maintenance Graph State (Annotation-based).
 * Flow: loadCurrentFeed → scoreFeedHealth → [conditional: rediscover | END] → logMaintenance → END
 */
export declare const MaintenanceGraphState: import("@langchain/langgraph").AnnotationRoot<{
    userId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    /** Active intents for the user (used for rediscovery). */
    activeIntents: import("@langchain/langgraph").BaseChannel<{
        id: string;
        payload: string;
    }[], {
        id: string;
        payload: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        id: string;
        payload: string;
    }[]>, unknown>;
    /** Current actionable opportunities for the user. */
    currentOpportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
    /** Current expired opportunities count. */
    expiredCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    /** Unix ms timestamp of last rediscovery for this user. */
    lastRediscoveryAt: import("@langchain/langgraph").BaseChannel<number | null, number | import("@langchain/langgraph").OverwriteValue<number | null> | null, unknown>;
    /** Feed health score result. */
    healthResult: import("@langchain/langgraph").BaseChannel<FeedHealthResult | null, FeedHealthResult | import("@langchain/langgraph").OverwriteValue<FeedHealthResult | null> | null, unknown>;
    /** Number of rediscovery jobs enqueued. */
    rediscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    /** Current connector-flow opportunity count (from scoreFeedHealth). */
    connectorFlowCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    /** Number of introducer discovery jobs enqueued. */
    introducerDiscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
}>;
//# sourceMappingURL=maintenance.state.d.ts.map