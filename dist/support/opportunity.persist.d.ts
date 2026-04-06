/**
 * Shared persist phase for opportunity creation: enrichOrCreate → create (or create+expire) → optional chat injection.
 * Used by the opportunity graph persist node and by the manual opportunity service for consistency.
 */
import type { CreateOpportunityData, Opportunity, OpportunityStatus } from '../interfaces/database.interface';
import type { Embedder } from '../interfaces/embedder.interface';
import type { EnricherDatabase } from './opportunity.enricher';
export type PersistOpportunityDatabase = EnricherDatabase & {
    createOpportunity(data: CreateOpportunityData): Promise<Opportunity>;
    updateOpportunityStatus(id: string, status: OpportunityStatus): Promise<void | Opportunity | null>;
    createOpportunityAndExpireIds?(data: CreateOpportunityData, expireIds: string[]): Promise<{
        created: Opportunity;
        expired: Opportunity[];
    }>;
    /** Optional: used to populate expired list in non-atomic path. */
    getOpportunity?(id: string): Promise<Opportunity | null>;
};
export interface PersistOpportunitiesParams {
    database: PersistOpportunityDatabase;
    embedder: Embedder;
    items: CreateOpportunityData[];
    injectChat?: (opportunity: Opportunity) => Promise<unknown>;
}
export interface PersistOpportunitiesError {
    itemIndex: number;
    error: unknown;
}
export interface PersistOpportunitiesResult {
    created: Opportunity[];
    expired: Opportunity[];
    errors?: PersistOpportunitiesError[];
}
/**
 * Persist one or more opportunities: enrich (merge overlapping), create, expire replaced, optional chat injection.
 * When the database has createOpportunityAndExpireIds and enrichment produced expireIds, uses it for atomic create+expire.
 * Returns both created and expired so callers can emit events (e.g. manual service).
 */
export declare function persistOpportunities(params: PersistOpportunitiesParams): Promise<PersistOpportunitiesResult>;
//# sourceMappingURL=opportunity.persist.d.ts.map