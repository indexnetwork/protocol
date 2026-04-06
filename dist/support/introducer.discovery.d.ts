/**
 * Introducer Discovery: proactive discovery of connector-flow opportunities
 * between a user's contacts.
 *
 * Selects top-N contacts from the user's personal index and runs scoped
 * HyDE discovery for each, creating latent introducer opportunities that
 * the user (as introducer) must approve before parties see them.
 */
/** Maximum contacts to evaluate per maintenance cycle. */
export declare const MAX_CONTACTS_PER_CYCLE = 5;
/** Maximum candidate opportunities per contact. */
export declare const MAX_CANDIDATES_PER_CONTACT = 3;
/** Detection source value for introducer-discovered opportunities. */
export declare const INTRODUCER_DISCOVERY_SOURCE: "introducer_discovery";
/** A contact with their active intents, used for introducer discovery selection. */
export interface ContactWithIntents {
    userId: string;
    /** Most recent intent updatedAt timestamp (ISO string or null). */
    latestIntentAt: string | null;
    /** Number of active intents this contact has. */
    intentCount: number;
}
/** Database methods needed for introducer discovery contact selection. */
export interface IntroducerDiscoveryDatabase {
    /** Get the user's personal index ID. */
    getPersonalIndexId(userId: string): Promise<string | null>;
    /** Get contacts from a personal index with their intent freshness data. */
    getContactsWithIntentFreshness(personalIndexId: string, ownerId: string, limit: number): Promise<ContactWithIntents[]>;
}
/** Queue interface for enqueuing introducer discovery jobs. */
export interface IntroducerDiscoveryQueue {
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
/** Result of a single introducer discovery cycle. */
export interface IntroducerDiscoveryResult {
    contactsEvaluated: number;
    jobsEnqueued: number;
    skippedReason?: string;
}
/**
 * Select top-N contacts for introducer discovery, sorted by intent freshness.
 * Contacts with no active intents are excluded.
 *
 * @param database - Database adapter with contact/intent queries
 * @param userId - The introducer user
 * @param limit - Max contacts to return (default MAX_CONTACTS_PER_CYCLE)
 * @returns Sorted contacts with intent data
 */
export declare function selectContactsForDiscovery(database: IntroducerDiscoveryDatabase, userId: string, limit?: number): Promise<ContactWithIntents[]>;
/**
 * Determine whether introducer discovery should run based on the current
 * connector-flow composition. Triggers when connector-flow count is below
 * the soft target.
 *
 * @param connectorFlowCount - Current number of connector-flow opportunities
 * @param connectorFlowTarget - Soft target (default 2)
 * @returns Whether introducer discovery should run
 */
export declare function shouldRunIntroducerDiscovery(connectorFlowCount: number, connectorFlowTarget?: number): boolean;
/**
 * Run introducer discovery for a user: select contacts, enqueue discovery jobs.
 * Each job uses onBehalfOfUserId so the opportunity graph treats the user as introducer.
 *
 * @param database - Database adapter for contact queries
 * @param queue - Queue for enqueuing discovery jobs
 * @param userId - The introducer user
 * @returns Summary of the discovery cycle
 */
export declare function runIntroducerDiscovery(database: IntroducerDiscoveryDatabase, queue: IntroducerDiscoveryQueue, userId: string): Promise<IntroducerDiscoveryResult>;
//# sourceMappingURL=introducer.discovery.d.ts.map