/**
 * Introducer Discovery: proactive discovery of connector-flow opportunities
 * between a user's contacts.
 *
 * Selects top-N contacts from the user's personal index and runs scoped
 * HyDE discovery for each, creating latent introducer opportunities that
 * the user (as introducer) must approve before parties see them.
 */
import { protocolLogger } from './protocol.logger.js';
const logger = protocolLogger('IntroducerDiscovery');
/** Maximum contacts to evaluate per maintenance cycle. */
export const MAX_CONTACTS_PER_CYCLE = 5;
/** Maximum candidate opportunities per contact. */
export const MAX_CANDIDATES_PER_CONTACT = 3;
/** Detection source value for introducer-discovered opportunities. */
export const INTRODUCER_DISCOVERY_SOURCE = 'introducer_discovery';
/**
 * Select top-N contacts for introducer discovery, sorted by intent freshness.
 * Contacts with no active intents are excluded.
 *
 * @param database - Database adapter with contact/intent queries
 * @param userId - The introducer user
 * @param limit - Max contacts to return (default MAX_CONTACTS_PER_CYCLE)
 * @returns Sorted contacts with intent data
 */
export async function selectContactsForDiscovery(database, userId, limit = MAX_CONTACTS_PER_CYCLE) {
    const personalIndexId = await database.getPersonalIndexId(userId);
    if (!personalIndexId) {
        logger.verbose(`[IntroducerDiscovery] No personal index found — userId=${userId}`);
        return [];
    }
    const contacts = await database.getContactsWithIntentFreshness(personalIndexId, userId, limit);
    logger.verbose(`[IntroducerDiscovery] Selected contacts for discovery — userId=${userId} totalContacts=${contacts.length} limit=${limit}`);
    return contacts;
}
/**
 * Determine whether introducer discovery should run based on the current
 * connector-flow composition. Triggers when connector-flow count is below
 * the soft target.
 *
 * @param connectorFlowCount - Current number of connector-flow opportunities
 * @param connectorFlowTarget - Soft target (default 2)
 * @returns Whether introducer discovery should run
 */
export function shouldRunIntroducerDiscovery(connectorFlowCount, connectorFlowTarget = 2) {
    return connectorFlowCount < connectorFlowTarget;
}
/**
 * Run introducer discovery for a user: select contacts, enqueue discovery jobs.
 * Each job uses onBehalfOfUserId so the opportunity graph treats the user as introducer.
 *
 * @param database - Database adapter for contact queries
 * @param queue - Queue for enqueuing discovery jobs
 * @param userId - The introducer user
 * @returns Summary of the discovery cycle
 */
export async function runIntroducerDiscovery(database, queue, userId) {
    const personalIndexId = await database.getPersonalIndexId(userId);
    if (!personalIndexId) {
        return { contactsEvaluated: 0, jobsEnqueued: 0, skippedReason: 'no_personal_index' };
    }
    const contacts = await selectContactsForDiscovery(database, userId);
    if (contacts.length === 0) {
        return { contactsEvaluated: 0, jobsEnqueued: 0, skippedReason: 'no_contacts' };
    }
    const bucket = Math.floor(Date.now() / (12 * 60 * 60 * 1000)); // 12h dedup bucket
    let jobsEnqueued = 0;
    const results = await Promise.allSettled(contacts.map(async (contact) => {
        // For each contact, we enqueue a discovery job using one of their intents
        // The opportunity graph will use onBehalfOfUserId to discover on behalf of the contact
        // while the userId (introducer) gets the introducer role
        const jobId = `introducer-discovery-${userId}-${contact.userId}-${bucket}`;
        try {
            await queue.addJob({
                intentId: `introducer:${contact.userId}`,
                userId,
                indexIds: [personalIndexId],
                contactUserId: contact.userId,
            }, { priority: 15, jobId });
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (/duplicate|already exists|job.*id/i.test(message)) {
                logger.verbose(`[IntroducerDiscovery] Job skipped (duplicate) — userId=${userId} contactUserId=${contact.userId} error=${message}`);
                return false;
            }
            throw err;
        }
    }));
    for (const r of results) {
        if (r.status === 'rejected') {
            const errMsg = r.reason instanceof Error ? r.reason.message : String(r.reason);
            logger.error(`[IntroducerDiscovery] Job enqueue failed: ${errMsg}`);
        }
    }
    jobsEnqueued = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    logger.info(`[IntroducerDiscovery] Discovery cycle complete — userId=${userId} contactsEvaluated=${contacts.length} jobsEnqueued=${jobsEnqueued}`);
    return { contactsEvaluated: contacts.length, jobsEnqueued };
}
//# sourceMappingURL=introducer.discovery.js.map