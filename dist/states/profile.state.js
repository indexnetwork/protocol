import { Annotation } from "@langchain/langgraph";
/**
 * The Graph State for Profile Generation.
 */
export const ProfileGraphState = Annotation.Root({
    // --- Inputs (Required at start) ---
    /**
     * The User ID to link the profile to.
     */
    userId: (Annotation),
    // --- Control Fields (Operation Mode) ---
    /**
     * Operation mode controls graph flow:
     * - 'query': Fast path - only retrieve existing profile (no generation)
     * - 'write': Full pipeline - generate/update profile and hyde as needed
     * - 'generate': Auto-generate profile from user table data via enrichUserProfile Chat API
     */
    operationMode: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 'write',
    }),
    /**
     * Flag to force profile regeneration even if profile exists.
     * When true with new input, the graph will re-generate and update the profile.
     */
    forceUpdate: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    // --- Intermediate State ---
    /**
     * Pre-populated profile from external enrichment (e.g. Parallel Chat API).
     * When provided, the graph skips profile generation and only runs embedding + HyDE.
     */
    prePopulatedProfile: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /**
     * Internal objective constructed from user data.
     */
    objective: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /**
     * Raw input data (either provided or scraped).
     */
    input: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /**
     * The generated or loaded profile document.
     * Includes embedding from DB. Profile HyDE is stored in hyde_documents.
     */
    profile: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /**
     * Flags to track what needs to be generated.
     */
    needsProfileGeneration: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    needsProfileEmbedding: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    needsHydeGeneration: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    needsHydeEmbedding: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    /**
     * Flag indicating that user information is insufficient for accurate profile generation.
     * When true, the graph should request additional information from the user.
     */
    needsUserInfo: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => false,
    }),
    /**
     * List of missing user information fields.
     * Used to construct a helpful clarification message.
     */
    missingUserInfo: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => [],
    }),
    // --- Output ---
    /**
     * The generated HyDE description string from the HydeGenerator.
     */
    hydeDescription: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /**
     * Error message if any step fails (non-fatal).
     */
    error: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    // --- Operation Tracking (for transparency) ---
    /**
     * Tracks which operations were actually performed during this graph execution.
     * Used to provide explicit feedback to the user about what happened.
     */
    operationsPerformed: Annotation({
        reducer: (curr, next) => ({ ...curr, ...next }),
        default: () => ({}),
    }),
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: Annotation({
        reducer: (acc, val) => [...acc, ...val],
        default: () => [],
    }),
    /**
     * Output for query mode: structured result for the tool to read.
     */
    readResult: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
});
//# sourceMappingURL=profile.state.js.map