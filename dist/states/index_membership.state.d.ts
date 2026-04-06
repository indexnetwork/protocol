/**
 * Index Membership Graph State.
 * Handles CRUD operations for index memberships (index_members table).
 *
 * Flow:
 * START → routerNode → {addMemberNode | listMembersNode | removeMemberNode} → END
 */
export declare const IndexMembershipGraphState: import("@langchain/langgraph").AnnotationRoot<{
    /** User performing the action (the actor). Always required. */
    userId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /** Target index. Required for all operations. */
    indexId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /** Operation mode. */
    operationMode: import("@langchain/langgraph").BaseChannel<"create" | "delete" | "read", "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read">, unknown>;
    /** For create/delete: the user being added/removed. */
    targetUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Output for read mode: list of members. */
    readResult: import("@langchain/langgraph").BaseChannel<{
        indexId: string;
        count: number;
        members: Array<{
            userId: string;
            name: string;
            avatar: string | null;
            permissions: string[];
            intentCount: number;
            joinedAt: Date;
        }>;
    } | undefined, {
        indexId: string;
        count: number;
        members: Array<{
            userId: string;
            name: string;
            avatar: string | null;
            permissions: string[];
            intentCount: number;
            joinedAt: Date;
        }>;
    } | import("@langchain/langgraph").OverwriteValue<{
        indexId: string;
        count: number;
        members: Array<{
            userId: string;
            name: string;
            avatar: string | null;
            permissions: string[];
            intentCount: number;
            joinedAt: Date;
        }>;
    } | undefined> | undefined, unknown>;
    /** Output for create/delete modes. */
    mutationResult: import("@langchain/langgraph").BaseChannel<{
        success: boolean;
        message?: string;
        error?: string;
    } | undefined, {
        success: boolean;
        message?: string;
        error?: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        success: boolean;
        message?: string;
        error?: string;
    } | undefined> | undefined, unknown>;
    /** Error message if graph could not complete. */
    error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
}>;
//# sourceMappingURL=index_membership.state.d.ts.map