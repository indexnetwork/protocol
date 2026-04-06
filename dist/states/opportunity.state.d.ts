import type { Id } from '../interfaces/database.interface.js';
import type { OpportunityStatus, Opportunity } from '../interfaces/database.interface.js';
import type { Lens } from '../interfaces/embedder.interface.js';
import type { EvaluatorEntity } from '../agents/opportunity.evaluator.js';
import type { DebugMetaAgent } from '../types/chat-streaming.types.js';
/**
 * Opportunity Graph State (Linear Multi-Step Workflow)
 *
 * Flow: Prep → Scope → Discovery → Evaluation → Ranking → Persist → END
 *
 * Following the intent graph pattern with Annotation-based state management.
 */
/** Asker's profile shape (embedding + optional identity/narrative/attributes). Used by sourceProfile annotation. */
export interface SourceProfileData {
    embedding: number[] | null;
    identity?: {
        name?: string;
        bio?: string;
        location?: string;
    };
    narrative?: {
        context?: string;
    };
    attributes?: {
        skills?: string[];
        interests?: string[];
    };
}
/**
 * Indexed intent with hyde document (from prep node)
 */
export interface IndexedIntent {
    intentId: Id<'intents'>;
    payload: string;
    summary?: string;
    hydeDocumentId?: string;
    hydeEmbedding?: number[];
    indexes: Id<'indexes'>[];
}
/**
 * Target index for search (from scope node)
 */
export interface TargetIndex {
    indexId: Id<'indexes'>;
    title: string;
    memberCount: number;
}
/**
 * Candidate match from discovery (semantic search).
 * candidateIntentId is set for intent matches; omitted for profile-only matches.
 */
export interface CandidateMatch {
    candidateUserId: Id<'users'>;
    candidateIntentId?: Id<'intents'>;
    indexId: Id<'indexes'>;
    similarity: number;
    /** Free-text lens label that produced this match. */
    lens: string;
    candidatePayload: string;
    candidateSummary?: string;
    /** How this candidate was found: 'query' (HyDE from search text) or 'profile-similarity'. */
    discoverySource?: 'query' | 'profile-similarity';
}
/**
 * Evaluated candidate with LLM scoring (legacy; used when evaluator returns source/candidate pair).
 * candidateIntentId is set for intent matches; omitted for profile-only matches.
 */
export interface EvaluatedCandidate {
    sourceUserId: Id<'users'>;
    candidateUserId: Id<'users'>;
    sourceIntentId?: Id<'intents'>;
    candidateIntentId?: Id<'intents'>;
    indexId: Id<'indexes'>;
    score: number;
    reasoning: string;
    valencyRole: 'Agent' | 'Patient' | 'Peer';
    /** Free-text lens label that produced this match. */
    lens: string;
}
/**
 * Actor in an evaluated opportunity (from entity-bundle evaluator).
 * indexId is filled from the entity bundle in the graph, not by the evaluator.
 */
export interface EvaluatedOpportunityActor {
    userId: Id<'users'>;
    role: 'agent' | 'patient' | 'peer';
    intentId?: Id<'intents'>;
    indexId: Id<'indexes'>;
}
/**
 * Evaluated opportunity with multi-actor output (entity-bundle evaluator).
 */
export interface EvaluatedOpportunity {
    actors: EvaluatedOpportunityActor[];
    score: number;
    reasoning: string;
}
/**
 * Options passed to the graph
 */
export interface OpportunityGraphOptions {
    /** Initial status for created opportunities (default: 'pending') */
    initialStatus?: OpportunityStatus;
    /** Minimum score threshold (default: 50) */
    minScore?: number;
    /** Maximum opportunities to return (default: 20) */
    limit?: number;
    /** Pre-inferred lenses (if not provided, lens inference runs automatically in HyDE graph) */
    lenses?: Lens[];
    /** User's search query for HyDE generation */
    hydeDescription?: string;
    /** Existing opportunities summary for evaluator deduplication */
    existingOpportunities?: string;
    /** Chat session ID for draft opportunities; stored as context.conversationId for visibility filtering. */
    conversationId?: string;
}
/**
 * Opportunity Graph State Annotation
 */
export declare const OpportunityGraphState: import("@langchain/langgraph").AnnotationRoot<{
    userId: import("@langchain/langgraph").BaseChannel<Id<"users">, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users">>, unknown>;
    searchQuery: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    indexId: import("@langchain/langgraph").BaseChannel<Id<"indexes"> | undefined, Id<"indexes"> | import("@langchain/langgraph").OverwriteValue<Id<"indexes"> | undefined> | undefined, unknown>;
    /** Optional intent to use as discovery source and for triggeredBy. When set, used for search text (if query empty) and persist. */
    triggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
    /** Optional: restrict discovery to this specific user ID only (direct connection). */
    targetUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
    /** Optional: discover on behalf of this user (introducer flow). When set, prep/eval use this user's profile/intents; userId becomes the introducer. */
    onBehalfOfUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
    options: import("@langchain/langgraph").BaseChannel<OpportunityGraphOptions, OpportunityGraphOptions | import("@langchain/langgraph").OverwriteValue<OpportunityGraphOptions>, unknown>;
    /**
     * Operation mode controls graph flow:
     * - 'create': Existing discover pipeline (Prep → Scope → Discovery → Evaluation → Ranking → Persist)
     * - 'create_introduction': Introduction path (validation → evaluation → persist) for chat-driven intros
     * - 'continue_discovery': Pagination path (Prep → Evaluation → Ranking → Persist) using pre-loaded candidates
     * - 'read': List opportunities filtered by userId and optionally indexId (fast path)
     * - 'update': Change opportunity status (accept, reject, etc.)
     * - 'delete': Expire/archive an opportunity
     * - 'send': Promote latent opportunity to pending + queue notification
     *
     * Defaults to 'create' for backward compatibility.
     */
    operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send", "create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send">, unknown>;
    /** Introduction mode: pre-gathered entities (profiles + intents per party). */
    introductionEntities: import("@langchain/langgraph").BaseChannel<EvaluatorEntity[], EvaluatorEntity[] | import("@langchain/langgraph").OverwriteValue<EvaluatorEntity[]>, unknown>;
    /** Introduction mode: optional hint from the introducer. */
    introductionHint: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** When set (e.g. chat scope), indexId must match this. */
    requiredIndexId: import("@langchain/langgraph").BaseChannel<Id<"indexes"> | undefined, Id<"indexes"> | import("@langchain/langgraph").OverwriteValue<Id<"indexes"> | undefined> | undefined, unknown>;
    /** Set by intro_evaluation; used by persist to build manual detection and introducer actor. */
    introductionContext: import("@langchain/langgraph").BaseChannel<{
        createdByName?: string;
    } | undefined, {
        createdByName?: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        createdByName?: string;
    } | undefined> | undefined, unknown>;
    /** Target opportunity ID for update/delete/send modes. */
    opportunityId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** New status for update mode (e.g. 'accepted', 'rejected'). */
    newStatus: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** User's indexed intents with hyde documents (from prep) */
    indexedIntents: import("@langchain/langgraph").BaseChannel<IndexedIntent[], IndexedIntent[] | import("@langchain/langgraph").OverwriteValue<IndexedIntent[]>, unknown>;
    /** User's index memberships (from prep) */
    userIndexes: import("@langchain/langgraph").BaseChannel<Id<"indexes">[], Id<"indexes">[] | import("@langchain/langgraph").OverwriteValue<Id<"indexes">[]>, unknown>;
    /** Target indexes to search within (from scope) */
    targetIndexes: import("@langchain/langgraph").BaseChannel<TargetIndex[], TargetIndex[] | import("@langchain/langgraph").OverwriteValue<TargetIndex[]>, unknown>;
    /** Per-index relevancy scores for dedup tie-breaking. Background path: from intent_indexes. Chat path: transient from IntentIndexer. */
    indexRelevancyScores: import("@langchain/langgraph").BaseChannel<Record<string, number>, Record<string, number> | import("@langchain/langgraph").OverwriteValue<Record<string, number>>, unknown>;
    /** Whether discovery used intent (path A) or profile (path B/C). Used by persist for triggeredBy. */
    discoverySource: import("@langchain/langgraph").BaseChannel<"profile" | "intent", "profile" | "intent" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent">, unknown>;
    /** Resolved intent ID used for this discovery run (when discoverySource is 'intent'). Set by intent-resolution. */
    resolvedTriggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
    /** Asker's profile (from prep). Used for profile-as-source discovery and evaluation. */
    sourceProfile: import("@langchain/langgraph").BaseChannel<SourceProfileData | null, SourceProfileData | import("@langchain/langgraph").OverwriteValue<SourceProfileData | null> | null, unknown>;
    /** Resolved intent is in at least one target index (path A vs C). */
    resolvedIntentInIndex: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /** Create-intent signal: when true, tool should return createIntentSuggested so agent can auto-call create_intent. */
    createIntentSuggested: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /** Suggested description for create_intent when createIntentSuggested is true. */
    suggestedIntentDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** HyDE embeddings per lens label (from discovery) */
    hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
    /** Candidate matches from semantic search (from discovery) */
    candidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
    /** Candidates not yet evaluated (for pagination -- cached in Redis by caller). */
    remainingCandidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
    /** Discovery session ID for pagination (maps to Redis cache key). */
    discoveryId: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
    /** Evaluated candidates with scores (from evaluation; legacy) */
    evaluatedCandidates: import("@langchain/langgraph").BaseChannel<EvaluatedCandidate[], EvaluatedCandidate[] | import("@langchain/langgraph").OverwriteValue<EvaluatedCandidate[]>, unknown>;
    /** Evaluated opportunities with actors (from entity-bundle evaluator) */
    evaluatedOpportunities: import("@langchain/langgraph").BaseChannel<EvaluatedOpportunity[], EvaluatedOpportunity[] | import("@langchain/langgraph").OverwriteValue<EvaluatedOpportunity[]>, unknown>;
    /** Final ranked and persisted opportunities */
    opportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
    /** Discovery path: pairs skipped because an opportunity already exists between viewer and candidate (no duplicate created). */
    existingBetweenActors: import("@langchain/langgraph").BaseChannel<{
        candidateUserId: Id<"users">;
        indexId: Id<"indexes">;
        existingOpportunityId?: Id<"opportunities">;
        existingStatus?: OpportunityStatus;
    }[], {
        candidateUserId: Id<"users">;
        indexId: Id<"indexes">;
        existingOpportunityId?: Id<"opportunities">;
        existingStatus?: OpportunityStatus;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        candidateUserId: Id<"users">;
        indexId: Id<"indexes">;
        existingOpportunityId?: Id<"opportunities">;
        existingStatus?: OpportunityStatus;
    }[]>, unknown>;
    /** Error message if any step fails */
    error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Output for read mode: enriched list of opportunities. */
    readResult: import("@langchain/langgraph").BaseChannel<{
        count: number;
        message?: string;
        opportunities: Array<{
            id: string;
            indexName: string;
            connectedWith: string[];
            suggestedBy: string | null;
            reasoning: string;
            status: string;
            category: string;
            confidence: number | null;
            source: string | null;
        }>;
    } | undefined, {
        count: number;
        message?: string;
        opportunities: Array<{
            id: string;
            indexName: string;
            connectedWith: string[];
            suggestedBy: string | null;
            reasoning: string;
            status: string;
            category: string;
            confidence: number | null;
            source: string | null;
        }>;
    } | import("@langchain/langgraph").OverwriteValue<{
        count: number;
        message?: string;
        opportunities: Array<{
            id: string;
            indexName: string;
            connectedWith: string[];
            suggestedBy: string | null;
            reasoning: string;
            status: string;
            category: string;
            confidence: number | null;
            source: string | null;
        }>;
    } | undefined> | undefined, unknown>;
    /** Output for update/delete/send modes. */
    mutationResult: import("@langchain/langgraph").BaseChannel<{
        success: boolean;
        message?: string;
        opportunityId?: string;
        notified?: string[];
        error?: string;
    } | undefined, {
        success: boolean;
        message?: string;
        opportunityId?: string;
        notified?: string[];
        error?: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        success: boolean;
        message?: string;
        opportunityId?: string;
        notified?: string[];
        error?: string;
    } | undefined> | undefined, unknown>;
    /**
     * Accumulated trace entries from each graph node.
     * Used for observability: surfaces internal processing steps (search query, HyDE strategies,
     * candidates found, evaluation results) to the frontend.
     */
    trace: import("@langchain/langgraph").BaseChannel<{
        node: string;
        detail?: string;
        data?: Record<string, unknown>;
    }[], {
        node: string;
        detail?: string;
        data?: Record<string, unknown>;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        node: string;
        detail?: string;
        data?: Record<string, unknown>;
    }[]>, unknown>;
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
}>;
//# sourceMappingURL=opportunity.state.d.ts.map