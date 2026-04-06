import { Annotation } from "@langchain/langgraph";
/**
 * Index Membership Graph State.
 * Handles CRUD operations for index memberships (index_members table).
 *
 * Flow:
 * START → routerNode → {addMemberNode | listMembersNode | removeMemberNode} → END
 */
export const IndexMembershipGraphState = Annotation.Root({
    // --- Core Inputs (from ChatGraph via ToolContext) ---
    /** User performing the action (the actor). Always required. */
    userId: (Annotation),
    /** Target index. Required for all operations. */
    indexId: (Annotation),
    /** Operation mode. */
    operationMode: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 'read',
    }),
    // --- Mode-Specific Inputs ---
    /** For create/delete: the user being added/removed. */
    targetUserId: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    // --- Outputs ---
    /** Output for read mode: list of members. */
    readResult: Annotation({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    /** Output for create/delete modes. */
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
//# sourceMappingURL=index_membership.state.js.map