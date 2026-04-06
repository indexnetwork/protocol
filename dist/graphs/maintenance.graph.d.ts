/** Database methods needed by the maintenance graph (includes introducer discovery). */
export interface MaintenanceGraphDatabase {
    getOpportunitiesForUser(userId: string, options?: {
        limit?: number;
    }): Promise<Array<{
        id: string;
        actors: Array<{
            userId: string;
            role: string;
        }>;
        status: string;
        [key: string]: unknown;
    }>>;
    getActiveIntents(userId: string): Promise<Array<{
        id: string;
        payload: string;
    }>>;
    /** Get the user's personal index ID (for introducer discovery). */
    getPersonalIndexId(userId: string): Promise<string | null>;
    /** Get contacts with intent freshness data from a personal index (for introducer discovery). */
    getContactsWithIntentFreshness(personalIndexId: string, ownerId: string, limit: number): Promise<Array<{
        userId: string;
        latestIntentAt: string | null;
        intentCount: number;
    }>>;
}
/** Cache methods needed by the maintenance graph. */
export interface MaintenanceGraphCache {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown, options?: {
        ttl?: number;
    }): Promise<void>;
}
/** Queue methods needed by the maintenance graph. */
export interface MaintenanceGraphQueue {
    addJob(data: {
        intentId: string;
        userId: string;
        indexIds?: string[];
        contactUserId?: string;
    }, options?: {
        priority?: number;
        jobId?: string;
    }): Promise<unknown>;
}
/**
 * Factory for the Maintenance Graph.
 * Accepts database, cache, and queue dependencies via constructor injection.
 */
export declare class MaintenanceGraphFactory {
    private database;
    private cache;
    private queue;
    constructor(database: MaintenanceGraphDatabase, cache: MaintenanceGraphCache, queue: MaintenanceGraphQueue);
    /** Compile and return the maintenance graph. */
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        activeIntents: {
            id: string;
            payload: string;
        }[];
        currentOpportunities: import("..").Opportunity[];
        expiredCount: number;
        lastRediscoveryAt: number | null;
        healthResult: import("../support/feed.health").FeedHealthResult | null;
        rediscoveryJobsEnqueued: number;
        connectorFlowCount: number;
        introducerDiscoveryJobsEnqueued: number;
        error: string | undefined;
    }, {
        userId?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
        activeIntents?: {
            id: string;
            payload: string;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            id: string;
            payload: string;
        }[]> | undefined;
        currentOpportunities?: import("..").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("..").Opportunity[]> | undefined;
        expiredCount?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        lastRediscoveryAt?: number | import("@langchain/langgraph").OverwriteValue<number | null> | null | undefined;
        healthResult?: import("../support/feed.health").FeedHealthResult | import("@langchain/langgraph").OverwriteValue<import("../support/feed.health").FeedHealthResult | null> | null | undefined;
        rediscoveryJobsEnqueued?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        connectorFlowCount?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        introducerDiscoveryJobsEnqueued?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
    }, "__start__" | "loadCurrentFeed" | "scoreFeedHealth" | "rediscover" | "introducerDiscovery" | "logMaintenance", {
        userId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
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
        currentOpportunities: import("@langchain/langgraph").BaseChannel<import("..").Opportunity[], import("..").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("..").Opportunity[]>, unknown>;
        expiredCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        lastRediscoveryAt: import("@langchain/langgraph").BaseChannel<number | null, number | import("@langchain/langgraph").OverwriteValue<number | null> | null, unknown>;
        healthResult: import("@langchain/langgraph").BaseChannel<import("../support/feed.health").FeedHealthResult | null, import("../support/feed.health").FeedHealthResult | import("@langchain/langgraph").OverwriteValue<import("../support/feed.health").FeedHealthResult | null> | null, unknown>;
        rediscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        connectorFlowCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        introducerDiscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    }, {
        userId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
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
        currentOpportunities: import("@langchain/langgraph").BaseChannel<import("..").Opportunity[], import("..").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("..").Opportunity[]>, unknown>;
        expiredCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        lastRediscoveryAt: import("@langchain/langgraph").BaseChannel<number | null, number | import("@langchain/langgraph").OverwriteValue<number | null> | null, unknown>;
        healthResult: import("@langchain/langgraph").BaseChannel<import("../support/feed.health").FeedHealthResult | null, import("../support/feed.health").FeedHealthResult | import("@langchain/langgraph").OverwriteValue<import("../support/feed.health").FeedHealthResult | null> | null, unknown>;
        rediscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        connectorFlowCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        introducerDiscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        loadCurrentFeed: import("@langchain/langgraph").UpdateType<{
            userId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
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
            currentOpportunities: import("@langchain/langgraph").BaseChannel<import("..").Opportunity[], import("..").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("..").Opportunity[]>, unknown>;
            expiredCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
            lastRediscoveryAt: import("@langchain/langgraph").BaseChannel<number | null, number | import("@langchain/langgraph").OverwriteValue<number | null> | null, unknown>;
            healthResult: import("@langchain/langgraph").BaseChannel<import("../support/feed.health").FeedHealthResult | null, import("../support/feed.health").FeedHealthResult | import("@langchain/langgraph").OverwriteValue<import("../support/feed.health").FeedHealthResult | null> | null, unknown>;
            rediscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
            connectorFlowCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
            introducerDiscoveryJobsEnqueued: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
            error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        }>;
        scoreFeedHealth: {
            healthResult?: undefined;
            connectorFlowCount?: undefined;
            error?: undefined;
        } | {
            healthResult: import("../support/feed.health").FeedHealthResult;
            connectorFlowCount: number;
            error?: undefined;
        } | {
            error: string;
            healthResult?: undefined;
            connectorFlowCount?: undefined;
        };
        rediscover: {
            rediscoveryJobsEnqueued: number;
            error?: undefined;
        } | {
            error: string;
            rediscoveryJobsEnqueued?: undefined;
        };
        introducerDiscovery: {
            introducerDiscoveryJobsEnqueued?: undefined;
        } | {
            introducerDiscoveryJobsEnqueued: number;
        };
        logMaintenance: {};
    }, unknown, unknown>;
}
//# sourceMappingURL=maintenance.graph.d.ts.map