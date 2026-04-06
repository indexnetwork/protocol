import { Annotation } from "@langchain/langgraph";
/**
 * Opportunity Graph State Annotation
 */
export const OpportunityGraphState = Annotation.Root({
    // ─── Input Fields (Required) ───
    userId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => '',
    }),
    searchQuery: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    networkId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** Optional intent to use as discovery source and for triggeredBy. When set, used for search text (if query empty) and persist. */
    triggerIntentId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** Optional: restrict discovery to this specific user ID only (direct connection). */
    targetUserId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** Optional: discover on behalf of this user (introducer flow). When set, prep/eval use this user's profile/intents; userId becomes the introducer. */
    onBehalfOfUserId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    options: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({}),
    }),
    /**
     * Operation mode controls graph flow:
     * - 'create': Existing discover pipeline (Prep → Scope → Discovery → Evaluation → Ranking → Persist)
     * - 'create_introduction': Introduction path (validation → evaluation → persist) for chat-driven intros
     * - 'continue_discovery': Pagination path (Prep → Evaluation → Ranking → Persist) using pre-loaded candidates
     * - 'read': List opportunities filtered by userId and optionally networkId (fast path)
     * - 'update': Change opportunity status (accept, reject, etc.)
     * - 'delete': Expire/archive an opportunity
     * - 'send': Promote latent opportunity to pending + queue notification
     *
     * Defaults to 'create' for backward compatibility.
     */
    operationMode: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 'create',
    }),
    /** Introduction mode: pre-gathered entities (profiles + intents per party). */
    introductionEntities: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Introduction mode: optional hint from the introducer. */
    introductionHint: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** When set (e.g. chat scope), networkId must match this. */
    requiredNetworkId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** Set by intro_evaluation; used by persist to build manual detection and introducer actor. */
    introductionContext: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** Target opportunity ID for update/delete/send modes. */
    opportunityId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** New status for update mode (e.g. 'accepted', 'rejected'). */
    newStatus: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    // ─── Intermediate Fields (Accumulated) ───
    /** User's indexed intents with hyde documents (from prep) */
    indexedIntents: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** User's network memberships (from prep) */
    userNetworks: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Target indexes to search within (from scope) */
    targetNetworks: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Per-index relevancy scores for dedup tie-breaking. Background path: from intent_indexes. Chat path: transient from IntentIndexer. */
    indexRelevancyScores: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({}),
    }),
    /** Whether discovery used intent (path A) or profile (path B/C). Used by persist for triggeredBy. */
    discoverySource: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 'intent',
    }),
    /** Resolved intent ID used for this discovery run (when discoverySource is 'intent'). Set by intent-resolution. */
    resolvedTriggerIntentId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** Asker's profile (from prep). Used for profile-as-source discovery and evaluation. */
    sourceProfile: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => null,
    }),
    /** Resolved intent is in at least one target index (path A vs C). */
    resolvedIntentInIndex: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    /** Create-intent signal: when true, tool should return createIntentSuggested so agent can auto-call create_intent. */
    createIntentSuggested: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    /** Suggested description for create_intent when createIntentSuggested is true. */
    suggestedIntentDescription: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /** HyDE embeddings per lens label (from discovery) */
    hydeEmbeddings: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({}),
    }),
    /** Candidate matches from semantic search (from discovery) */
    candidates: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Candidates not yet evaluated (for pagination -- cached in Redis by caller). */
    remainingCandidates: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Discovery session ID for pagination (maps to Redis cache key). */
    discoveryId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => null,
    }),
    /** Evaluated candidates with scores (from evaluation; legacy) */
    evaluatedCandidates: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Evaluated opportunities with actors (from entity-bundle evaluator) */
    evaluatedOpportunities: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    // ─── Output Fields (Overwrite per turn) ───
    /** Final ranked and persisted opportunities */
    opportunities: Annotation({
        reducer: (curr, next) => next,
        default: () => [],
    }),
    /** Discovery path: pairs skipped because an opportunity already exists between viewer and candidate (no duplicate created). */
    existingBetweenActors: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    /** Error message if any step fails */
    error: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /** Output for read mode: enriched list of opportunities. */
    readResult: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /** Output for update/delete/send modes. */
    mutationResult: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    // ─── Trace Output ───
    /**
     * Accumulated trace entries from each graph node.
     * Used for observability: surfaces internal processing steps (search query, HyDE strategies,
     * candidates found, evaluation results) to the frontend.
     */
    trace: Annotation({
        reducer: (curr, next) => [...curr, ...(next || [])],
        default: () => [],
    }),
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: Annotation({
        reducer: (acc, val) => [...acc, ...val],
        default: () => [],
    }),
});
//# sourceMappingURL=opportunity.state.js.map