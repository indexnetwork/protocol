/**
 * Opportunity graph utilities: role derivation from corpus type.
 * Used by the opportunity graph to map lens corpus to opportunity actor roles.
 *
 * With lens-based HyDE, strategy selection is handled automatically by the
 * LensInferrer agent. This file provides corpus-to-role mapping for opportunity actors.
 */
import type { HydeTargetCorpus } from '../agents/lens.inferrer.js';
/** Actor roles in the opportunity model (agent / patient / peer). */
export type OpportunityActorRole = 'agent' | 'patient' | 'peer';
/** Result of mapping a corpus to source and candidate roles. */
export interface DerivedRoles {
    sourceRole: OpportunityActorRole;
    candidateRole: OpportunityActorRole;
}
/**
 * Derive actor roles from the corpus type of a lens match.
 *
 * When a candidate is found via:
 * - "profiles" corpus → found by who they are → candidate can help → agent
 * - "intents" corpus → found by what they need → candidate needs something → patient
 *
 * @param corpus - The target corpus that produced the match ('profiles' | 'intents')
 * @returns Roles for the source (intent owner) and the candidate (matched user/intent)
 */
export declare function deriveRolesFromCorpus(corpus: HydeTargetCorpus): DerivedRoles;
/**
 * Validates opportunity actors: if an opportunity has an introducer, it must have
 * one or two non-introducer actors (1 = 1:1 intro e.g. "I want to connect with X";
 * 2 = introducer connecting two others).
 *
 * @param actors - Array of actors with at least a role and optional userId
 * @throws Error when the actor set is invalid
 */
export declare function validateOpportunityActors(actors: Array<{
    userId?: string;
    role: string;
}>): void;
/**
 * Role-based visibility (Latent Opportunity Lifecycle).
 * A user can see an opportunity iff they are an actor and the rule below allows it.
 *
 * Compact Visibility Rule (from lifecycle doc):
 * - Introducer or peer: always see.
 * - Patient or party: see if (status is not latent, or there is no introducer).
 * - Agent: see if (status is accepted/rejected/expired, or (status is not latent and there is no introducer)).
 */
export declare function canUserSeeOpportunity(actors: Array<{
    userId: string;
    role: string;
}>, status: string, userId: string): boolean;
/**
 * Whether an opportunity should appear on the Home feed for the viewer (actionable = has a pending action).
 * Encodes the role-visibility matrix from the Latent Opportunity Lifecycle.
 */
export declare function isActionableForViewer(actors: Array<{
    userId: string;
    role: string;
}>, status: string, viewerId: string): boolean;
/** Feed category for home composition. */
export type FeedCategory = 'connection' | 'connector-flow' | 'expired';
/** Soft targets for home feed composition. */
export declare const FEED_SOFT_TARGETS: {
    readonly connection: 3;
    readonly connectorFlow: 2;
    readonly expired: 2;
};
/**
 * Classify an actionable opportunity into a feed category.
 * Assumes the opportunity already passed isActionableForViewer or is expired.
 *
 * @param opp - Opportunity with actors and status
 * @param viewerId - The viewing user's ID
 * @returns Feed category
 */
export declare function classifyOpportunity(opp: {
    actors: Array<{
        userId: string;
        role: string;
    }>;
    status: string;
}, viewerId: string): FeedCategory;
/**
 * Select opportunities for the home feed using soft composition targets.
 * Fills each category up to its target, then redistributes unused slots
 * to categories that have more items available. Preserves input order.
 *
 * @param opportunities - Pre-sorted opportunities (by confidence/recency)
 * @param viewerId - The viewing user's ID
 * @returns Composition-balanced subset
 */
export declare function selectByComposition<T extends {
    actors: Array<{
        userId: string;
        role: string;
    }>;
    status: string;
}>(opportunities: T[], viewerId: string): T[];
//# sourceMappingURL=opportunity.utils.d.ts.map