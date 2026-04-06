import type { NetworkMembershipGraphDatabase } from "../interfaces/database.interface.js";
/**
 * Factory class to build and compile the Index Membership Graph.
 *
 * Handles CRUD operations for the index_members table:
 * - create: Add a member to an index (validates join policy and ownership)
 * - read: List members of an index (validates caller is member)
 * - delete: Remove a member from an index (future, validates ownership)
 */
export declare class NetworkMembershipGraphFactory {
    private database;
    constructor(database: NetworkMembershipGraphDatabase);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        networkId: string;
        operationMode: "create" | "delete" | "read";
        targetUserId: string | undefined;
        readResult: {
            networkId: string;
            count: number;
            members: Array<{
                userId: string;
                name: string;
                avatar: string | null;
                permissions: string[];
                intentCount: number;
                joinedAt: Date;
            }>;
        } | undefined;
        mutationResult: {
            success: boolean;
            message?: string;
            error?: string;
        } | undefined;
        error: string | null;
    }, {
        userId?: string | undefined;
        networkId?: string | undefined;
        operationMode?: "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read"> | undefined;
        targetUserId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        readResult?: {
            networkId: string;
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
            networkId: string;
            count: number;
            members: Array<{
                userId: string;
                name: string;
                avatar: string | null;
                permissions: string[];
                intentCount: number;
                joinedAt: Date;
            }>;
        } | undefined> | undefined;
        mutationResult?: {
            success: boolean;
            message?: string;
            error?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            success: boolean;
            message?: string;
            error?: string;
        } | undefined> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | null> | null | undefined;
    }, "__start__" | "add_member" | "list_members" | "remove_member", {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        networkId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "delete" | "read", "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read">, unknown>;
        targetUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            networkId: string;
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
            networkId: string;
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
            networkId: string;
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
        error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
    }, {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        networkId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "delete" | "read", "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read">, unknown>;
        targetUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            networkId: string;
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
            networkId: string;
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
            networkId: string;
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
        error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        add_member: {
            mutationResult: {
                success: boolean;
                error: string;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                message: string;
                error?: undefined;
            };
        };
        list_members: {
            readResult: {
                networkId: string;
                count: number;
                members: never[];
            };
            error: string;
        } | {
            readResult: {
                networkId: string;
                count: number;
                members: {
                    userId: string;
                    name: string;
                    avatar: string | null;
                    permissions: string[];
                    intentCount: number;
                    joinedAt: Date;
                }[];
            };
            error?: undefined;
        } | {
            error: string;
            readResult?: undefined;
        };
        remove_member: {
            mutationResult: {
                success: boolean;
                error: string;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                message: string;
                error?: undefined;
            };
        };
    }, unknown, unknown>;
}
//# sourceMappingURL=network_membership.graph.d.ts.map