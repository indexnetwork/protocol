import { VerifiedIntent, ExecutionResult } from "../states/intent.state.js";
import { IntentGraphDatabase } from "../interfaces/database.interface.js";
import type { EmbeddingGenerator } from "../interfaces/embedder.interface.js";
import type { IntentGraphQueue } from "../interfaces/queue.interface.js";
import type { DebugMetaAgent } from "../types/chat-streaming.types.js";
/**
 * Factory class to build and compile the Intent Processing Graph.
 */
export declare class IntentGraphFactory {
    private database;
    private embedder?;
    private intentQueue?;
    constructor(database: IntentGraphDatabase, embedder?: EmbeddingGenerator | undefined, intentQueue?: IntentGraphQueue | undefined);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        userProfile: string;
        inputContent: string | undefined;
        conversationContext: import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined;
        operationMode: "create" | "update" | "delete" | "read" | "propose";
        targetIntentIds: string[] | undefined;
        indexId: string | undefined;
        activeIntents: string;
        inferredIntents: {
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[];
        verifiedIntents: VerifiedIntent[];
        actions: import("../agents/intent.reconciler.js").NormalizedIntentAction[];
        executionResults: ExecutionResult[];
        error: string | undefined;
        trace: {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[];
        agentTimings: DebugMetaAgent[];
        queryUserId: string | undefined;
        allUserIntents: boolean;
        readResult: {
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | undefined;
    }, {
        userId?: string | undefined;
        userProfile?: string | undefined;
        inputContent?: string | undefined;
        conversationContext?: import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined> | undefined;
        operationMode?: "create" | "update" | "delete" | "read" | "propose" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "propose"> | undefined;
        targetIntentIds?: string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined;
        indexId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        activeIntents?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
        inferredIntents?: {
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[]> | undefined;
        verifiedIntents?: VerifiedIntent[] | import("@langchain/langgraph").OverwriteValue<VerifiedIntent[]> | undefined;
        actions?: import("../agents/intent.reconciler.js").NormalizedIntentAction[] | import("@langchain/langgraph").OverwriteValue<import("../agents/intent.reconciler.js").NormalizedIntentAction[]> | undefined;
        executionResults?: ExecutionResult[] | import("@langchain/langgraph").OverwriteValue<ExecutionResult[]> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        trace?: {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[]> | undefined;
        agentTimings?: DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]> | undefined;
        queryUserId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        allUserIntents?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        readResult?: {
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | undefined> | undefined;
    }, "query" | "__start__" | "prep" | "inference" | "verification" | "reconciler" | "executor", {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        userProfile: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        inputContent: {
            (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            (): import("@langchain/langgraph").LastValue<string | undefined>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        conversationContext: import("@langchain/langgraph").BaseChannel<import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined, import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined> | undefined, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "propose", "create" | "update" | "delete" | "read" | "propose" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "propose">, unknown>;
        targetIntentIds: import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        activeIntents: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        inferredIntents: import("@langchain/langgraph").BaseChannel<{
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[], {
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[]>, unknown>;
        verifiedIntents: import("@langchain/langgraph").BaseChannel<VerifiedIntent[], VerifiedIntent[] | import("@langchain/langgraph").OverwriteValue<VerifiedIntent[]>, unknown>;
        actions: import("@langchain/langgraph").BaseChannel<import("../agents/intent.reconciler.js").NormalizedIntentAction[], import("../agents/intent.reconciler.js").NormalizedIntentAction[] | import("@langchain/langgraph").OverwriteValue<import("../agents/intent.reconciler.js").NormalizedIntentAction[]>, unknown>;
        executionResults: import("@langchain/langgraph").BaseChannel<ExecutionResult[], ExecutionResult[] | import("@langchain/langgraph").OverwriteValue<ExecutionResult[]>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        trace: import("@langchain/langgraph").BaseChannel<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[], {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[]>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
        queryUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        allUserIntents: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | undefined, {
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | undefined> | undefined, unknown>;
    }, {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        userProfile: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        inputContent: {
            (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            (): import("@langchain/langgraph").LastValue<string | undefined>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        conversationContext: import("@langchain/langgraph").BaseChannel<import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined, import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined> | undefined, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "propose", "create" | "update" | "delete" | "read" | "propose" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "propose">, unknown>;
        targetIntentIds: import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        activeIntents: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        inferredIntents: import("@langchain/langgraph").BaseChannel<{
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[], {
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[]>, unknown>;
        verifiedIntents: import("@langchain/langgraph").BaseChannel<VerifiedIntent[], VerifiedIntent[] | import("@langchain/langgraph").OverwriteValue<VerifiedIntent[]>, unknown>;
        actions: import("@langchain/langgraph").BaseChannel<import("../agents/intent.reconciler.js").NormalizedIntentAction[], import("../agents/intent.reconciler.js").NormalizedIntentAction[] | import("@langchain/langgraph").OverwriteValue<import("../agents/intent.reconciler.js").NormalizedIntentAction[]>, unknown>;
        executionResults: import("@langchain/langgraph").BaseChannel<ExecutionResult[], ExecutionResult[] | import("@langchain/langgraph").OverwriteValue<ExecutionResult[]>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        trace: import("@langchain/langgraph").BaseChannel<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[], {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[]>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
        queryUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        allUserIntents: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | undefined, {
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            count: number;
            intents: Array<{
                id: string;
                description: string;
                summary: string | null;
                createdAt: Date;
                userId?: string;
                userName?: string | null;
            }>;
            message?: string;
            indexId?: string;
        } | undefined> | undefined, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        prep: {
            error: string;
            activeIntents?: undefined;
            trace?: undefined;
        } | {
            activeIntents: string;
            trace: {
                node: string;
                detail: string;
            }[];
            error?: undefined;
        };
        query: {
            readResult: {
                count: number;
                intents: never[];
                message: string;
                indexId?: undefined;
            };
        } | {
            readResult: {
                count: number;
                intents: never[];
                message: string;
                indexId: string;
            };
        } | {
            readResult: {
                count: number;
                indexId: string;
                intents: {
                    id: string;
                    description: string;
                    summary: string | null;
                    createdAt: Date;
                    userId: string;
                    userName: string | null;
                }[];
                message?: undefined;
            };
        } | {
            readResult: {
                count: number;
                intents: {
                    id: string;
                    description: string;
                    summary: string | null;
                    createdAt: Date;
                }[];
                message?: undefined;
                indexId?: undefined;
            };
        };
        inference: {
            inferredIntents: {
                reasoning: string;
                confidence: "low" | "medium" | "high";
                type: "goal" | "tombstone";
                description: string;
            }[];
            agentTimings: DebugMetaAgent[];
            trace: {
                node: string;
                detail: string;
            }[];
        };
        verification: {
            verifiedIntents: never[];
            agentTimings: never[];
            trace?: undefined;
        } | {
            verifiedIntents: VerifiedIntent[];
            agentTimings: DebugMetaAgent[];
            trace: {
                node: string;
                detail: string;
                data: {
                    clarity: number;
                    authority: number;
                    sincerity: number;
                    entropy: number | undefined;
                    classification: "COMMISSIVE" | "DIRECTIVE" | "ASSERTIVE" | "EXPRESSIVE" | "DECLARATION" | "UNKNOWN" | undefined;
                    score: number | undefined;
                } | undefined;
            }[];
        };
        reconciler: import("@langchain/langgraph").UpdateType<{
            userId: {
                (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
                (): import("@langchain/langgraph").LastValue<string>;
                Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
            };
            userProfile: {
                (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
                (): import("@langchain/langgraph").LastValue<string>;
                Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
            };
            inputContent: {
                (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
                (): import("@langchain/langgraph").LastValue<string | undefined>;
                Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
            };
            conversationContext: import("@langchain/langgraph").BaseChannel<import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined, import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<import("@langchain/core/messages").BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined> | undefined, unknown>;
            operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "propose", "create" | "update" | "delete" | "read" | "propose" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "propose">, unknown>;
            targetIntentIds: import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
            indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            activeIntents: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            inferredIntents: import("@langchain/langgraph").BaseChannel<{
                reasoning: string;
                confidence: "low" | "medium" | "high";
                type: "goal" | "tombstone";
                description: string;
            }[], {
                reasoning: string;
                confidence: "low" | "medium" | "high";
                type: "goal" | "tombstone";
                description: string;
            }[] | import("@langchain/langgraph").OverwriteValue<{
                reasoning: string;
                confidence: "low" | "medium" | "high";
                type: "goal" | "tombstone";
                description: string;
            }[]>, unknown>;
            verifiedIntents: import("@langchain/langgraph").BaseChannel<VerifiedIntent[], VerifiedIntent[] | import("@langchain/langgraph").OverwriteValue<VerifiedIntent[]>, unknown>;
            actions: import("@langchain/langgraph").BaseChannel<import("../agents/intent.reconciler.js").NormalizedIntentAction[], import("../agents/intent.reconciler.js").NormalizedIntentAction[] | import("@langchain/langgraph").OverwriteValue<import("../agents/intent.reconciler.js").NormalizedIntentAction[]>, unknown>;
            executionResults: import("@langchain/langgraph").BaseChannel<ExecutionResult[], ExecutionResult[] | import("@langchain/langgraph").OverwriteValue<ExecutionResult[]>, unknown>;
            error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            trace: import("@langchain/langgraph").BaseChannel<{
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[], {
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[] | import("@langchain/langgraph").OverwriteValue<{
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[]>, unknown>;
            agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
            queryUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            allUserIntents: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
            readResult: import("@langchain/langgraph").BaseChannel<{
                count: number;
                intents: Array<{
                    id: string;
                    description: string;
                    summary: string | null;
                    createdAt: Date;
                    userId?: string;
                    userName?: string | null;
                }>;
                message?: string;
                indexId?: string;
            } | undefined, {
                count: number;
                intents: Array<{
                    id: string;
                    description: string;
                    summary: string | null;
                    createdAt: Date;
                    userId?: string;
                    userName?: string | null;
                }>;
                message?: string;
                indexId?: string;
            } | import("@langchain/langgraph").OverwriteValue<{
                count: number;
                intents: Array<{
                    id: string;
                    description: string;
                    summary: string | null;
                    createdAt: Date;
                    userId?: string;
                    userName?: string | null;
                }>;
                message?: string;
                indexId?: string;
            } | undefined> | undefined, unknown>;
        }>;
        executor: {
            executionResults: ExecutionResult[];
        };
    }, unknown, unknown>;
}
//# sourceMappingURL=intent.graph.d.ts.map