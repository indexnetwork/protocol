import { Annotation } from "@langchain/langgraph";
/**
 * Index Graph State.
 * Handles CRUD operations for indexes (communities).
 *
 * Flow:
 * START → routerNode → {createNode | readNode | updateNode | deleteNode} → END
 */
export const IndexGraphState = Annotation.Root({
    // --- Core Inputs (from ChatGraph via ToolContext) ---
    /** User performing the action. Always required. */
    userId: (Annotation),
    /** Target index ID. Required for read/update/delete. From ChatGraph or tool arg. */
    indexId: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Operation mode. */
    operationMode: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 'read',
    }),
    // --- Mode-Specific Inputs ---
    /** For create mode: index creation data. */
    createInput: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** For update mode: fields to update. */
    updateInput: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** When true and index-scoped, read returns all user indexes (not just scoped one). */
    showAll: Annotation({
        reducer: (_, next) => next,
        default: () => false,
    }),
    // --- Outputs ---
    /** Output for read mode. */
    readResult: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Output for create/update/delete modes. */
    mutationResult: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Error message if graph could not complete. */
    error: Annotation({
        reducer: (_, next) => next,
        default: () => null,
    }),
});
//# sourceMappingURL=index.state.js.map