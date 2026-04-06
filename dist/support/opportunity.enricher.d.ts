/**
 * Opportunity enricher: when creating an opportunity, find overlapping existing
 * opportunities (by non-introducer actor userId), check semantic relatedness, and
 * optionally merge into a single enriched opportunity and expire the old one(s).
 */
import type { CreateOpportunityData, Opportunity, OpportunityStatus } from '../interfaces/database.interface';
import type { Embedder } from '../interfaces/embedder.interface';
import type { Id } from '../interfaces/database.interface';
export type EnricherDatabase = {
    findOverlappingOpportunities(actorUserIds: Id<'users'>[], options?: {
        excludeStatuses?: ('latent' | 'pending' | 'accepted' | 'rejected' | 'expired')[];
    }): Promise<Opportunity[]>;
};
export type EnrichmentResult = {
    enriched: false;
    data: CreateOpportunityData;
} | {
    enriched: true;
    data: CreateOpportunityData;
    expiredIds: string[];
    resolvedStatus: OpportunityStatus;
};
export type EnrichOrCreateOptions = {
    similarityThreshold?: number;
};
/**
 * Enrich or create: find overlapping opportunities, filter by semantic relatedness
 * using a two-phase approach, merge actors and interpretation into a single
 * CreateOpportunityData, and return the data plus IDs to expire. If no related
 * overlap, return original data unchanged.
 *
 * Phase 1 — Intent check (free, no API call):
 *   Shared intent IDs mean the same declared user goal drove both opportunities.
 *   This is rare because the IntentReconciler already deduplicates intents per-user
 *   upstream, but when it fires it is definitive.
 *
 * Phase 2 — Batched embedding similarity (one API call for all remaining):
 *   For opportunities without shared intents, embed all reasoning texts in a single
 *   batch call and compare cosine similarity. Cross-user intent comparison (e.g.
 *   Alice's "find ML co-founder" vs Bob's "join ML startup") is implicitly handled
 *   here since reasoning text synthesizes both users' intents.
 */
export declare function enrichOrCreate(database: EnricherDatabase, embedder: Embedder, newData: CreateOpportunityData, options?: EnrichOrCreateOptions): Promise<EnrichmentResult>;
//# sourceMappingURL=opportunity.enricher.d.ts.map