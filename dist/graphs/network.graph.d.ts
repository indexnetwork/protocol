import { NetworkGraphDatabase } from "../interfaces/database.interface.js";
/**
 * Factory class to build and compile the Index (CRUD) Graph.
 *
 * Handles create, read, update, and delete operations for indexes.
 * Membership and intent-index assignment operations are handled by
 * separate graphs (NetworkMembershipGraph and IntentNetworkGraph).
 *
 * Flow:
 * START → routerNode → {createNode | readNode | updateNode | deleteNode} → END
 */
export declare class NetworkGraphFactory {
    private database;
    constructor(database: NetworkGraphDatabase);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        networkId: string | undefined;
        operationMode: "create" | "update" | "delete" | "read";
        createInput: {
            title: string;
            prompt?: string;
            imageUrl?: string | null;
            joinPolicy?: "anyone" | "invite_only";
        } | undefined;
        updateInput: {
            title?: string;
            prompt?: string | null;
            imageUrl?: string | null;
            joinPolicy?: "anyone" | "invite_only";
            allowGuestVibeCheck?: boolean;
        } | undefined;
        showAll: boolean;
        readResult: {
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
        } | undefined;
        mutationResult: {
            success: boolean;
            networkId?: string;
            title?: string;
            message?: string;
            error?: string;
        } | undefined;
        error: string | null;
    }, {
        userId?: string | undefined;
        networkId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        operationMode?: "create" | "update" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read"> | undefined;
        createInput?: {
            title: string;
            prompt?: string;
            imageUrl?: string | null;
            joinPolicy?: "anyone" | "invite_only";
        } | import("@langchain/langgraph").OverwriteValue<{
            title: string;
            prompt?: string;
            imageUrl?: string | null;
            joinPolicy?: "anyone" | "invite_only";
        } | undefined> | undefined;
        updateInput?: {
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
        } | undefined> | undefined;
        showAll?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        readResult?: {
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
        } | undefined> | undefined;
        mutationResult?: {
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
        } | undefined> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | null> | null | undefined;
    }, "create" | "update" | "read" | "__start__" | "delete_idx", {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read", "create" | "update" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read">, unknown>;
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
        showAll: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
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
        error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
    }, {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read", "create" | "update" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read">, unknown>;
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
        showAll: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
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
        error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        read: {
            readResult: {
                memberOf: {
                    networkId: string;
                    title: string;
                    description: string | null;
                    autoAssign: boolean;
                    joinedAt: Date;
                }[];
                owns: {
                    networkId: string;
                    title: string;
                    description: string | null;
                    memberCount: number;
                    intentCount: number;
                    joinPolicy: "anyone" | "invite_only";
                }[];
                stats: {
                    memberOfCount: number;
                    ownsCount: number;
                    scopeNote: string;
                    publicIndexesCount?: undefined;
                };
                publicIndexes?: undefined;
            };
            error?: undefined;
        } | {
            readResult: {
                memberOf: {
                    networkId: string;
                    title: string;
                    description: string | null;
                    autoAssign: boolean;
                    joinedAt: Date;
                }[];
                owns: {
                    networkId: string;
                    title: string;
                    description: string | null;
                    memberCount: number;
                    intentCount: number;
                    joinPolicy: "anyone" | "invite_only";
                }[];
                publicIndexes: {
                    networkId: string;
                    title: string;
                    description: string | null;
                    memberCount: number;
                    owner: {
                        id: string;
                        name: string;
                        avatar: string | null;
                    } | null;
                }[];
                stats: {
                    memberOfCount: number;
                    ownsCount: number;
                    publicIndexesCount: number;
                    scopeNote?: undefined;
                };
            };
            error?: undefined;
        } | {
            error: string;
            readResult?: undefined;
        };
        create: {
            mutationResult: {
                success: boolean;
                error: string;
                networkId?: undefined;
                title?: undefined;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                networkId: string;
                title: string;
                message: string;
                error?: undefined;
            };
        };
        update: {
            mutationResult: {
                success: boolean;
                error: string;
                networkId?: undefined;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                networkId: string;
                message: string;
                error?: undefined;
            };
        };
        delete_idx: {
            mutationResult: {
                success: boolean;
                error: string;
                networkId?: undefined;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                networkId: string;
                message: string;
                error?: undefined;
            };
        };
    }, unknown, unknown>;
}
//# sourceMappingURL=network.graph.d.ts.map