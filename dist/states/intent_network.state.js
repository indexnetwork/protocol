import { Annotation } from "@langchain/langgraph";
/**
 * Intent Index Graph State.
 * Handles CRUD for the intent_indexes junction table (linking intents to indexes).
 * Absorbs the old Index Graph's evaluate-based assignment flow.
 *
 * Flow:
 * START → router → {
 *   create: assignNode (direct or evaluated) → END
 *   read: readNode → END
 *   delete: unassignNode → END
 * }
 */
export const IntentNetworkGraphState = Annotation.Root({
    // --- Core Inputs (from ChatGraph via ToolContext) ---
    /** User performing the action. Always required. */
    userId: (Annotation),
    /** Target index for assign/read-by-index. From ChatGraph or tool arg. */
    networkId: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Target intent for assign/read-by-intent. From tool arg. */
    intentId: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Operation mode. */
    operationMode: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 'read',
    }),
    // --- Create Mode Controls ---
    /**
     * When true, skip LLM evaluation and assign directly.
     * (Migrated from old Index Graph.)
     */
    skipEvaluation: Annotation({
        reducer: (_, next) => next,
        default: () => true,
    }),
    // --- Intermediate State (populated by nodes, migrated from old Index Graph) ---
    /** Intent payload and metadata. Null if intent not found. */
    intent: Annotation({
        reducer: (_, next) => next,
        default: () => null,
    }),
    /** Index + member context. Null if user not eligible. */
    indexContext: Annotation({
        reducer: (_, next) => next,
        default: () => null,
    }),
    /** LLM evaluation result. Null if skipped. */
    evaluation: Annotation({
        reducer: (_, next) => next,
        default: () => null,
    }),
    /** Final decision: should intent be in this index? */
    shouldAssign: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Final score used for decision (0–1). */
    finalScore: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Result of the assignment operation. */
    assignmentResult: Annotation({
        reducer: (_, next) => next,
        default: () => null,
    }),
    // --- Read Mode Outputs ---
    /** For read-by-intent: pass userId when listing an intent's indexes (omit for read-by-index). */
    queryUserId: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Output for read mode. */
    readResult: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Output for create/delete modes. */
    mutationResult: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Error message. */
    error: Annotation({
        reducer: (_, next) => next,
        default: () => null,
    }),
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: Annotation({
        reducer: (acc, val) => [...acc, ...val],
        default: () => [],
    }),
});
//# sourceMappingURL=intent_network.state.js.map