import type { BaseMessage } from "@langchain/core/messages";
import type { DebugMetaToolCall } from "../types/chat-streaming.types.js";
/** Routing decision from router node (target, operationType, extractedContext). */
export interface RoutingDecision {
    target: string;
    operationType: string | null;
    extractedContext?: string | null;
}
/** Intent subgraph result (actions, inferredIntents, etc.). */
export interface IntentSubgraphResult {
    actions?: Array<{
        type: string;
        payload?: string;
    }>;
    inferredIntents?: unknown[];
    indexingResults?: unknown[];
    mode?: string;
    intents?: unknown[];
    count?: number;
    error?: string;
    /** When the intent graph exits early (e.g. index-scoped without intents); surface to user. */
    requiredMessage?: string;
}
/** Index subgraph result (memberships, ownedIndexes, specificIndexData). */
export interface IndexSubgraphResult {
    mode?: string;
    memberships?: unknown[];
    ownedIndexes?: unknown[];
    specificIndexData?: unknown;
    count?: number;
    error?: string;
}
/** Aggregated results from subgraphs (intent, index, profile, opportunity, scrape). */
export interface SubgraphResults {
    intent?: IntentSubgraphResult;
    index?: IndexSubgraphResult;
    profile?: unknown;
    opportunity?: unknown;
    scrape?: unknown;
}
/**
 * The Chat Graph State using LangGraph Annotations.
 *
 * This is a simplified state for the agent loop architecture.
 * The agent handles all routing decisions internally via tool calling.
 *
 * Design Principles:
 * - Messages accumulate through the conversation (includes tool calls/results)
 * - Iteration count tracks loop progress for soft/hard limits
 * - Final response is extracted at the end
 */
export declare const ChatGraphState: import("@langchain/langgraph").AnnotationRoot<{
    /**
     * The User ID - required for all operations.
     */
    userId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /**
     * Optional index (community) ID when chat is scoped to a specific index.
     * When set, the agent and tools use this as the current index (e.g. read_intents,
     * create_intent with networkId, scope index assignment to this index only).
     */
    networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Chat session ID when streaming with context. Used by tools to create draft
     * opportunities tied to this conversation (context.conversationId).
     */
    sessionId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Conversation history using LangGraph's built-in message reducer.
     * Includes: HumanMessage, AIMessage, ToolMessage, SystemMessage
     * Automatically handles message appending, ID management, and ordering.
     */
    messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
    /**
     * Current iteration count in the agent loop.
     * Used for soft limit (nudge) and hard limit (force exit).
     */
    iterationCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    /**
     * Flag indicating whether the agent loop should continue.
     * Set to false when agent produces final response or hits hard limit.
     */
    shouldContinue: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /**
     * The final generated response text.
     * Set when the agent decides to stop and respond.
     */
    responseText: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Error message if the agent loop fails.
     */
    error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Per-turn debug meta (graph, iterations, tool calls) for copy-debug.
     * Not persisted; only used so the streamer receives it in the updates chunk.
     */
    debugMeta: import("@langchain/langgraph").BaseChannel<{
        graph: string;
        iterations: number;
        tools: DebugMetaToolCall[];
    } | undefined, {
        graph: string;
        iterations: number;
        tools: DebugMetaToolCall[];
    } | import("@langchain/langgraph").OverwriteValue<{
        graph: string;
        iterations: number;
        tools: DebugMetaToolCall[];
    } | undefined> | undefined, unknown>;
    /** Router output: target, operationType, extractedContext. */
    routingDecision: import("@langchain/langgraph").BaseChannel<RoutingDecision | undefined, RoutingDecision | import("@langchain/langgraph").OverwriteValue<RoutingDecision | undefined> | undefined, unknown>;
    /** Results from intent/profile/opportunity/scrape subgraphs. */
    subgraphResults: import("@langchain/langgraph").BaseChannel<SubgraphResults | undefined, SubgraphResults | import("@langchain/langgraph").OverwriteValue<SubgraphResults | undefined> | undefined, unknown>;
    /** User profile context (e.g. for intent nodes). */
    userProfile: import("@langchain/langgraph").BaseChannel<unknown, unknown, unknown>;
}>;
/**
 * The full state type for the Chat Graph.
 * Use this for typing node functions and graph invocations.
 */
export type ChatGraphStateType = typeof ChatGraphState.State;
//# sourceMappingURL=chat.state.d.ts.map