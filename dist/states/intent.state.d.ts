import { BaseMessage } from "@langchain/core/messages";
import { InferredIntent } from "../agents/intent.inferrer.js";
import { SemanticVerifierOutput } from "../agents/intent.verifier.js";
import type { DebugMetaAgent } from '../types/chat-streaming.types.js';
/**
 * Extended InferredIntent that includes verification results.
 * We attach the verification output directly to the intent object
 * as it flows through the graph.
 */
export type VerifiedIntent = InferredIntent & {
    verification?: SemanticVerifierOutput;
    score?: number;
};
/**
 * Result of executing a single reconciler action.
 */
export interface ExecutionResult {
    /** The action type that was executed */
    actionType: 'create' | 'update' | 'expire';
    /** Whether the action succeeded */
    success: boolean;
    /** The intent ID (created/updated/archived) */
    intentId?: string;
    /** Final payload (sanitized, for create/update) */
    payload?: string;
    /** Error message if failed */
    error?: string;
}
/**
 * The Graph State using LangGraph Annotations.
 * This acts as the central bus for data flowing through our graph.
 */
export declare const IntentGraphState: import("@langchain/langgraph").AnnotationRoot<{
    /**
     * The unique identifier of the user whose intents are being processed.
     * Required for database operations.
     */
    userId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /**
     * The user's profile context (Identity, Narrative, etc.)
     */
    userProfile: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /**
     * Explicit input content (e.g., user message).
     * Optional - graph might run on implicit only.
     */
    inputContent: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /**
     * Conversation history for context-aware intent inference.
     * Used to resolve anaphoric references ("that intent", "this goal").
     * Limited to recent messages (typically last 10) for token efficiency.
     * Optional - if not provided, intent inference uses only inputContent.
     */
    conversationContext: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined, BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | undefined> | undefined, unknown>;
    /**
     * Operation mode controls graph flow and determines which nodes execute.
     * - 'create': Full pipeline (prep → inference → verification → reconciliation → execution)
     * - 'update': Skip verification if no new intents (prep → inference → reconciliation → execution)
     * - 'delete': Skip inference and verification (prep → reconciliation → execution)
     * - 'read': Fast path (prep → queryNode → END) — reads intents without LLM calls
     * - 'propose': Inference + verification only, stops before reconciliation (no DB writes)
     *
     * Defaults to 'create' for backward compatibility.
     */
    operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "propose", "create" | "update" | "delete" | "read" | "propose" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "propose">, unknown>;
    /**
     * For update/delete operations, specifies which intent IDs to target.
     * Optional - used when modifying or removing specific intents.
     */
    targetIntentIds: import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
    /**
     * Optional index scope (index ID). Used for linking created intents to an index
     * and for scoping read operations. Prep always fetches ALL user intents via
     * getActiveIntents(userId) regardless of index scope (for global dedup/reconciliation).
     */
    indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * The formatted string of currently active intents.
     * Always populated by prep via getActiveIntents(userId).
     */
    activeIntents: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    /**
     * List of raw intents extracted from text.
     */
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
    /**
     * List of intents that have passed semantic verification.
     * Invalid intents are filtered out before reaching this state.
     */
    verifiedIntents: import("@langchain/langgraph").BaseChannel<VerifiedIntent[], VerifiedIntent[] | import("@langchain/langgraph").OverwriteValue<VerifiedIntent[]>, unknown>;
    /**
     * Final actions to be performed on the DB (Create, Update, Expire).
     */
    actions: import("@langchain/langgraph").BaseChannel<import("../agents/intent.reconciler.js").NormalizedIntentAction[], import("../agents/intent.reconciler.js").NormalizedIntentAction[] | import("@langchain/langgraph").OverwriteValue<import("../agents/intent.reconciler.js").NormalizedIntentAction[]>, unknown>;
    /**
     * Results of executing actions against the database.
     * Populated by executorNode after actions are persisted.
     */
    executionResults: import("@langchain/langgraph").BaseChannel<ExecutionResult[], ExecutionResult[] | import("@langchain/langgraph").OverwriteValue<ExecutionResult[]>, unknown>;
    /**
     * If set, indicates a fatal error that should short-circuit the graph to END.
     * Populated by prep when a precondition fails (e.g. missing profile).
     */
    error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Accumulated trace entries from each graph node.
     * Used for observability: surfaces internal processing steps (inference,
     * verification with Felicity scores, reconciliation) to the frontend.
     */
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
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    /**
     * For read mode: filter intents by a specific user when reading in an index.
     * When omitted and index-scoped, returns all intents in the index.
     */
    queryUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * For read mode: when true, return all of the current user's intents
     * ignoring index scope. Used before create_intent to detect duplicates.
     */
    allUserIntents: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /**
     * Output of read mode: queried intents with count and optional metadata.
     */
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
//# sourceMappingURL=intent.state.d.ts.map