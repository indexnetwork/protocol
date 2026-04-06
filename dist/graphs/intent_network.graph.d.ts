import { IntentIndexer } from "../agents/intent.indexer.js";
import type { IntentNetworkGraphDatabase } from "../interfaces/database.interface.js";
import type { DebugMetaAgent } from "../types/chat-streaming.types.js";
import { type IntentForIndexing, type IndexMemberContext, type AssignmentResult } from "../states/intent_network.state.js";
/**
 * Factory class to build and compile the Intent Index Graph.
 *
 * Handles CRUD for the intent_indexes junction table:
 * - create: Assign an intent to an index (direct or evaluated via IntentIndexer agent)
 * - read: List intent-index links (by intentId or by networkId)
 * - delete: Unassign an intent from an index
 *
 * The evaluate-based assignment flow is migrated from the old Index Graph.
 */
export declare class IntentNetworkGraphFactory {
    private database;
    private intentNetworker;
    constructor(database: IntentNetworkGraphDatabase, intentNetworker: IntentIndexer);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        networkId: string | undefined;
        intentId: string | undefined;
        operationMode: "create" | "delete" | "read";
        skipEvaluation: boolean;
        intent: IntentForIndexing | null;
        indexContext: IndexMemberContext | null;
        evaluation: {
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | null;
        shouldAssign: boolean | undefined;
        finalScore: number | undefined;
        assignmentResult: AssignmentResult | null;
        queryUserId: string | undefined;
        readResult: {
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
        } | undefined;
        mutationResult: {
            success: boolean;
            message?: string;
            error?: string;
        } | undefined;
        error: string | null;
        agentTimings: DebugMetaAgent[];
    }, {
        userId?: string | undefined;
        networkId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        intentId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        operationMode?: "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read"> | undefined;
        skipEvaluation?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        intent?: IntentForIndexing | import("@langchain/langgraph").OverwriteValue<IntentForIndexing | null> | null | undefined;
        indexContext?: IndexMemberContext | import("@langchain/langgraph").OverwriteValue<IndexMemberContext | null> | null | undefined;
        evaluation?: {
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | import("@langchain/langgraph").OverwriteValue<{
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | null> | null | undefined;
        shouldAssign?: boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined;
        finalScore?: number | import("@langchain/langgraph").OverwriteValue<number | undefined> | undefined;
        assignmentResult?: AssignmentResult | import("@langchain/langgraph").OverwriteValue<AssignmentResult | null> | null | undefined;
        queryUserId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        readResult?: {
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
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
        agentTimings?: DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]> | undefined;
    }, "read" | "__start__" | "assign" | "unassign", {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        intentId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "delete" | "read", "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read">, unknown>;
        skipEvaluation: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        intent: import("@langchain/langgraph").BaseChannel<IntentForIndexing | null, IntentForIndexing | import("@langchain/langgraph").OverwriteValue<IntentForIndexing | null> | null, unknown>;
        indexContext: import("@langchain/langgraph").BaseChannel<IndexMemberContext | null, IndexMemberContext | import("@langchain/langgraph").OverwriteValue<IndexMemberContext | null> | null, unknown>;
        evaluation: import("@langchain/langgraph").BaseChannel<{
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | null, {
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | import("@langchain/langgraph").OverwriteValue<{
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | null> | null, unknown>;
        shouldAssign: import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        finalScore: import("@langchain/langgraph").BaseChannel<number | undefined, number | import("@langchain/langgraph").OverwriteValue<number | undefined> | undefined, unknown>;
        assignmentResult: import("@langchain/langgraph").BaseChannel<AssignmentResult | null, AssignmentResult | import("@langchain/langgraph").OverwriteValue<AssignmentResult | null> | null, unknown>;
        queryUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
        } | undefined, {
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
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
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        intentId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "delete" | "read", "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read">, unknown>;
        skipEvaluation: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        intent: import("@langchain/langgraph").BaseChannel<IntentForIndexing | null, IntentForIndexing | import("@langchain/langgraph").OverwriteValue<IntentForIndexing | null> | null, unknown>;
        indexContext: import("@langchain/langgraph").BaseChannel<IndexMemberContext | null, IndexMemberContext | import("@langchain/langgraph").OverwriteValue<IndexMemberContext | null> | null, unknown>;
        evaluation: import("@langchain/langgraph").BaseChannel<{
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | null, {
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | import("@langchain/langgraph").OverwriteValue<{
            reasoning: string;
            indexScore: number;
            memberScore: number;
        } | null> | null, unknown>;
        shouldAssign: import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        finalScore: import("@langchain/langgraph").BaseChannel<number | undefined, number | import("@langchain/langgraph").OverwriteValue<number | undefined> | undefined, unknown>;
        assignmentResult: import("@langchain/langgraph").BaseChannel<AssignmentResult | null, AssignmentResult | import("@langchain/langgraph").OverwriteValue<AssignmentResult | null> | null, unknown>;
        queryUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
        } | undefined, {
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            links: Array<{
                intentId: string;
                networkId: string;
                intentTitle?: string;
                networkTitle?: string;
                userId?: string;
                userName?: string;
                createdAt?: Date;
            }>;
            count: number;
            mode: string;
            note?: string;
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
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        assign: {
            agentTimings: DebugMetaAgent[];
            mutationResult: {
                success: boolean;
                error: string;
                message?: undefined;
            };
            assignmentResult?: undefined;
            evaluation?: undefined;
            shouldAssign?: undefined;
            finalScore?: undefined;
        } | {
            agentTimings: DebugMetaAgent[];
            mutationResult: {
                success: boolean;
                message: string;
                error?: undefined;
            };
            assignmentResult?: undefined;
            evaluation?: undefined;
            shouldAssign?: undefined;
            finalScore?: undefined;
        } | {
            agentTimings: DebugMetaAgent[];
            assignmentResult: AssignmentResult;
            mutationResult: {
                success: boolean;
                message: string;
                error?: undefined;
            };
            evaluation?: undefined;
            shouldAssign?: undefined;
            finalScore?: undefined;
        } | {
            agentTimings: DebugMetaAgent[];
            evaluation: null;
            shouldAssign: boolean;
            finalScore: number;
            mutationResult: {
                success: boolean;
                error: string;
                message?: undefined;
            };
            assignmentResult?: undefined;
        } | {
            agentTimings: DebugMetaAgent[];
            evaluation: {
                reasoning: string;
                indexScore: number;
                memberScore: number;
            };
            shouldAssign: boolean;
            finalScore: number;
            assignmentResult: AssignmentResult;
            mutationResult: {
                success: boolean;
                message: string;
                error?: undefined;
            };
        } | {
            agentTimings: DebugMetaAgent[];
            evaluation: {
                reasoning: string;
                indexScore: number;
                memberScore: number;
            };
            shouldAssign: boolean;
            finalScore: number;
            assignmentResult: AssignmentResult;
            mutationResult: {
                success: boolean;
                error: string;
                message?: undefined;
            };
        };
        read: {
            readResult: {
                links: never[];
                count: number;
                mode: string;
                note?: undefined;
            };
            error: string;
        } | {
            readResult: {
                links: {
                    intentId: string;
                    networkId: string;
                }[];
                count: number;
                mode: string;
                note: string;
            };
            error?: undefined;
        } | {
            error: string;
            readResult?: undefined;
        };
        unassign: {
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
//# sourceMappingURL=intent_network.graph.d.ts.map