/**
 * Run discovery from an ad-hoc query (e.g. chat "find me a mentor", "who needs a React developer").
 *
 * Invokes the opportunity graph with the query as sourceText. The HyDE graph's
 * LensInferrer automatically infers search lenses from the query, replacing the
 * old hardcoded strategy selection. Returns formatted candidates (enriched with
 * profile name/bio) for chat display.
 *
 * Used by the create_opportunities chat tool.
 */
import type { ChatGraphCompositeDatabase } from "../interfaces/database.interface";
import type { Cache } from "../interfaces/cache.interface";
import { OpportunityPresenter, type OpportunityPresentationResult, type HomeCardPresentationResult } from "../agents/opportunity.presenter";
/** Compiled opportunity graph (from OpportunityGraphFactory.createGraph()). */
export type CompiledOpportunityGraph = ReturnType<import("../graphs/opportunity.graph").OpportunityGraphFactory["createGraph"]>;
export interface DiscoverInput {
    /** Compiled opportunity graph (already has DB, embedder, cache, HyDE graph). */
    opportunityGraph: CompiledOpportunityGraph;
    /** Database for enriching candidates with profile (getProfile). */
    database: ChatGraphCompositeDatabase;
    userId: string;
    query: string;
    indexScope: string[];
    limit?: number;
    /** Optional intent to use as discovery source and for triggeredBy (e.g. from opportunity queue). */
    triggerIntentId?: string;
    /** When set, filter discovery candidates to this specific user only (direct connection). */
    targetUserId?: string;
    /** When set, discover on behalf of this user (introducer flow). The caller (userId) becomes the introducer. */
    onBehalfOfUserId?: string;
    /** When provided, each opportunity is enriched with personalized presentation (headline, personalizedSummary, suggestedAction). */
    presenter?: OpportunityPresenter;
    /**
     * When true, use the full home card presentation format (with narratorRemark, action labels, mutualIntentsLabel).
     * This enables rendering the same rich opportunity cards in chat as on the home page.
     */
    useHomeCardFormat?: boolean;
    /**
     * When true, skip the LLM presenter and return minimal card data only (faster for chat).
     * Sets homeCardPresentation and narratorChip from static labels and match reason.
     */
    minimalForChat?: boolean;
    /** When set (e.g. from chat), create opportunities as draft with context.conversationId = chatSessionId. */
    chatSessionId?: string;
    /** Redis cache for discovery pagination. When provided, remaining candidates are cached for continuation. */
    cache?: Cache;
}
/** One formatted opportunity for chat (candidate-facing). */
export interface FormattedDiscoveryCandidate {
    opportunityId: string;
    userId: string;
    name?: string;
    avatar?: string | null;
    bio?: string;
    matchReason: string;
    score: number;
    status?: string;
    /** Present when DiscoverInput.presenter was provided (basic presentation). */
    presentation?: OpportunityPresentationResult;
    /** Present when DiscoverInput.useHomeCardFormat is true (full home card contract). */
    homeCardPresentation?: HomeCardPresentationResult;
    /** Viewer's role in this opportunity. */
    viewerRole?: string;
    /** Whether the counterpart is a ghost (not yet onboarded) user. */
    isGhost?: boolean;
    /** Narrator chip for home card display (name + remark, with optional avatar/userId for introducer). */
    narratorChip?: {
        name: string;
        text: string;
        avatar?: string | null;
        userId?: string;
    };
    /** Second party in introducer arrow layout (candidate -> secondParty). Present when viewer is introducer. */
    secondParty?: {
        name: string;
        avatar?: string | null;
        userId?: string;
    };
}
/** One step for debug visibility (subgraph/subtask). */
export interface DiscoverDebugStep {
    step: string;
    detail?: string;
    /** Structured data for rich display (e.g., candidate counts, scores). */
    data?: Record<string, unknown>;
}
/** One existing connection (no new opportunity created; user already has one with this person). */
export interface ExistingConnection {
    userId: string;
    name: string;
    status?: string;
    opportunityId?: string;
}
export interface DiscoverResult {
    found: boolean;
    count: number;
    message?: string;
    opportunities?: FormattedDiscoveryCandidate[];
    /** Existing connections eligible for card display (draft, latent, or pending). Others are mention-only. */
    existingConnections?: ExistingConnection[];
    /** All existing connections for mention text (e.g. "You already have a connection with: X (pending), Y (draft)."). */
    existingConnectionsForMention?: ExistingConnection[];
    /** When true, the chat agent should call create_intent(suggestedIntentDescription) and retry discovery. */
    createIntentSuggested?: boolean;
    /** Description to pass to create_intent when createIntentSuggested is true. */
    suggestedIntentDescription?: string;
    /** Internal steps for copy-debug (select_strategies, opportunity_graph, enrich, etc.). */
    debugSteps?: DiscoverDebugStep[];
    /** Pagination metadata -- present when there are more unevaluated candidates. */
    pagination?: {
        discoveryId: string;
        evaluated: number;
        remaining: number;
    };
}
/**
 * Run discovery from an ad-hoc query (e.g. "find me a mentor", "who needs a React developer").
 * The HyDE graph's LensInferrer automatically infers search lenses from the query.
 * Invokes the opportunity graph and returns formatted candidates suitable for chat display.
 */
export declare function runDiscoverFromQuery(input: DiscoverInput): Promise<DiscoverResult>;
/**
 * Continue a paginated discovery by evaluating the next batch of cached candidates.
 * Loads candidates from Redis, invokes the opportunity graph in continue_discovery mode,
 * then enriches and returns the results with updated pagination metadata.
 *
 * @param input - Continuation context (graph, database, cache, discoveryId, etc.).
 * @returns Discovery result with enriched opportunities and pagination state.
 */
export declare function continueDiscovery(input: {
    opportunityGraph: CompiledOpportunityGraph;
    database: ChatGraphCompositeDatabase;
    cache: Cache;
    userId: string;
    discoveryId: string;
    /** If provided, validates the cached session's indexScope contains this index. */
    expectedIndexId?: string;
    limit?: number;
    chatSessionId?: string;
    minimalForChat?: boolean;
    presenter?: OpportunityPresenter;
    useHomeCardFormat?: boolean;
}): Promise<DiscoverResult>;
//# sourceMappingURL=opportunity.discover.d.ts.map