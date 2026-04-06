/**
 * Index Graph State.
 * Handles CRUD operations for indexes (communities).
 *
 * Flow:
 * START → routerNode → {createNode | readNode | updateNode | deleteNode} → END
 */
export declare const NetworkGraphState: import("@langchain/langgraph").AnnotationRoot<{
    /** User performing the action. Always required. */
    userId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /** Target index ID. Required for read/update/delete. From ChatGraph or tool arg. */
    networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Operation mode. */
    operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read", "create" | "update" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read">, unknown>;
    /** For create mode: index creation data. */
    createInput: import("@langchain/langgraph").BaseChannel<{
        title: string;
        prompt?: string;
        imageUrl?: string | null;
        joinPolicy?: "anyone" | "invite_only";
    } | undefined, {
        title: string;
        prompt?: string;
        imageUrl?: string | null;
        joinPolicy?: "anyone" | "invite_only";
    } | import("@langchain/langgraph").OverwriteValue<{
        title: string;
        prompt?: string;
        imageUrl?: string | null;
        joinPolicy?: "anyone" | "invite_only";
    } | undefined> | undefined, unknown>;
    /** For update mode: fields to update. */
    updateInput: import("@langchain/langgraph").BaseChannel<{
        title?: string;
        prompt?: string | null;
        imageUrl?: string | null;
        joinPolicy?: "anyone" | "invite_only";
        allowGuestVibeCheck?: boolean;
    } | undefined, {
        title?: string;
        prompt?: string | null;
        imageUrl?: string | null;
        joinPolicy?: "anyone" | "invite_only";
        allowGuestVibeCheck?: boolean;
    } | import("@langchain/langgraph").OverwriteValue<{
        title?: string;
        prompt?: string | null;
        imageUrl?: string | null;
        joinPolicy?: "anyone" | "invite_only";
        allowGuestVibeCheck?: boolean;
    } | undefined> | undefined, unknown>;
    /** When true and index-scoped, read returns all user indexes (not just scoped one). */
    showAll: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /** Output for read mode. */
    readResult: import("@langchain/langgraph").BaseChannel<{
        memberOf: Array<{
            networkId: string;
            title: string;
            description: string | null;
            autoAssign: boolean;
            joinedAt: Date;
        }>;
        owns: Array<{
            networkId: string;
            title: string;
            description: string | null;
            memberCount: number;
            intentCount: number;
            joinPolicy: string;
        }>;
        publicIndexes?: Array<{
            networkId: string;
            title: string;
            description: string | null;
            memberCount: number;
            owner: {
                name: string;
                avatar: string | null;
            } | null;
        }>;
        stats: {
            memberOfCount: number;
            ownsCount: number;
            publicIndexesCount?: number;
            scopeNote?: string;
        };
    } | undefined, {
        memberOf: Array<{
            networkId: string;
            title: string;
            description: string | null;
            autoAssign: boolean;
            joinedAt: Date;
        }>;
        owns: Array<{
            networkId: string;
            title: string;
            description: string | null;
            memberCount: number;
            intentCount: number;
            joinPolicy: string;
        }>;
        publicIndexes?: Array<{
            networkId: string;
            title: string;
            description: string | null;
            memberCount: number;
            owner: {
                name: string;
                avatar: string | null;
            } | null;
        }>;
        stats: {
            memberOfCount: number;
            ownsCount: number;
            publicIndexesCount?: number;
            scopeNote?: string;
        };
    } | import("@langchain/langgraph").OverwriteValue<{
        memberOf: Array<{
            networkId: string;
            title: string;
            description: string | null;
            autoAssign: boolean;
            joinedAt: Date;
        }>;
        owns: Array<{
            networkId: string;
            title: string;
            description: string | null;
            memberCount: number;
            intentCount: number;
            joinPolicy: string;
        }>;
        publicIndexes?: Array<{
            networkId: string;
            title: string;
            description: string | null;
            memberCount: number;
            owner: {
                name: string;
                avatar: string | null;
            } | null;
        }>;
        stats: {
            memberOfCount: number;
            ownsCount: number;
            publicIndexesCount?: number;
            scopeNote?: string;
        };
    } | undefined> | undefined, unknown>;
    /** Output for create/update/delete modes. */
    mutationResult: import("@langchain/langgraph").BaseChannel<{
        success: boolean;
        networkId?: string;
        title?: string;
        message?: string;
        error?: string;
    } | undefined, {
        success: boolean;
        networkId?: string;
        title?: string;
        message?: string;
        error?: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        success: boolean;
        networkId?: string;
        title?: string;
        message?: string;
        error?: string;
    } | undefined> | undefined, unknown>;
    /** Error message if graph could not complete. */
    error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
}>;
//# sourceMappingURL=network.state.d.ts.map