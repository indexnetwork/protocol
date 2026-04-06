/**
 * Pure presentation layer for opportunities.
 * Generates title, description, and CTA based on viewer context — no DB access.
 */
import type { Opportunity } from '../interfaces/database.interface.js';
export interface OpportunityPresentation {
    title: string;
    description: string;
    callToAction: string;
}
export interface UserInfo {
    id: string;
    name: string;
    avatar: string | null;
}
/**
 * Generate presentation copy for an opportunity based on viewer context.
 * Pure function — no side effects, no database access.
 */
export declare function presentOpportunity(opp: Opportunity, viewerId: string, otherPartyInfo: UserInfo, introducerInfo: UserInfo | null, format: 'card' | 'email' | 'notification'): OpportunityPresentation;
//# sourceMappingURL=opportunity.presentation.d.ts.map