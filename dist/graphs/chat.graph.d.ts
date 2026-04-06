import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { BaseMessage } from "@langchain/core/messages";
import type { ChatGraphCompositeDatabase } from "../interfaces/database.interface.js";
import type { Embedder } from "../interfaces/embedder.interface.js";
import type { Scraper } from "../interfaces/scraper.interface.js";
import type { ChatSessionReader } from "../interfaces/chat-session.interface.js";
import type { ProtocolDeps } from "../tools/tool.helpers.js";
/**
 * Factory class to build and compile the Chat Graph.
 *
 * Architecture: ReAct-Style Agent Loop
 *
 * The graph contains a single node that runs an agent loop:
 * 1. Agent receives messages (conversation + tool results)
 * 2. Agent decides: call tools OR respond to user
 * 3. If tools called → execute → add results → loop back
 * 4. If response → exit loop → stream to user
 *
 * This replaces the previous 17-node conditional routing architecture
 * with a flexible, LLM-driven approach that can handle multi-step
 * reasoning and self-correction.
 */
export declare class ChatGraphFactory {
    private database;
    private embedder;
    private scraper;
    private chatSession;
    private protocolDeps;
    private streamingService;
    constructor(database: ChatGraphCompositeDatabase, embedder: Embedder, scraper: Scraper, chatSession: ChatSessionReader, protocolDeps: ProtocolDeps);
    /**
     * Creates and compiles the Chat Graph without persistence.
     * @returns Compiled StateGraph ready for invocation
     */
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        indexId: string | undefined;
        sessionId: string | undefined;
        messages: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[];
        iterationCount: number;
        shouldContinue: boolean;
        responseText: string | undefined;
        error: string | undefined;
        debugMeta: {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined;
        routingDecision: import("../states/chat.state.js").RoutingDecision | undefined;
        subgraphResults: import("../states/chat.state.js").SubgraphResults | undefined;
        userProfile: unknown;
    }, {
        userId?: string | undefined;
        indexId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        sessionId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        messages?: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]> | undefined;
        iterationCount?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        shouldContinue?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        responseText?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        debugMeta?: {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | import("@langchain/langgraph").OverwriteValue<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined> | undefined;
        routingDecision?: import("../states/chat.state.js").RoutingDecision | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").RoutingDecision | undefined> | undefined;
        subgraphResults?: import("../states/chat.state.js").SubgraphResults | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").SubgraphResults | undefined> | undefined;
        userProfile?: unknown;
    }, "__start__" | "agent_loop", {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        sessionId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
        iterationCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        shouldContinue: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        responseText: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        debugMeta: import("@langchain/langgraph").BaseChannel<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined, {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | import("@langchain/langgraph").OverwriteValue<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined> | undefined, unknown>;
        routingDecision: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").RoutingDecision | undefined, import("../states/chat.state.js").RoutingDecision | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").RoutingDecision | undefined> | undefined, unknown>;
        subgraphResults: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").SubgraphResults | undefined, import("../states/chat.state.js").SubgraphResults | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").SubgraphResults | undefined> | undefined, unknown>;
        userProfile: import("@langchain/langgraph").BaseChannel<unknown, unknown, unknown>;
    }, {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        sessionId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
        iterationCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        shouldContinue: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        responseText: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        debugMeta: import("@langchain/langgraph").BaseChannel<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined, {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | import("@langchain/langgraph").OverwriteValue<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined> | undefined, unknown>;
        routingDecision: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").RoutingDecision | undefined, import("../states/chat.state.js").RoutingDecision | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").RoutingDecision | undefined> | undefined, unknown>;
        subgraphResults: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").SubgraphResults | undefined, import("../states/chat.state.js").SubgraphResults | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").SubgraphResults | undefined> | undefined, unknown>;
        userProfile: import("@langchain/langgraph").BaseChannel<unknown, unknown, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        agent_loop: {
            messages: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[];
            responseText: string;
            iterationCount: number;
            shouldContinue: boolean;
            debugMeta: {
                graph: string;
                iterations: number;
                tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
            };
            error?: undefined;
        } | {
            error: string;
            responseText: string;
            shouldContinue: boolean;
            messages?: undefined;
            iterationCount?: undefined;
            debugMeta?: undefined;
        };
    }, unknown, unknown>;
    /**
     * Creates a streaming-enabled graph with optional checkpointer for persistence.
     * @param checkpointer - Optional checkpointer (e.g., MemorySaver or PostgresSaver)
     * @returns Compiled StateGraph ready for streaming
     */
    createStreamingGraph(checkpointer?: MemorySaver | PostgresSaver): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        indexId: string | undefined;
        sessionId: string | undefined;
        messages: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[];
        iterationCount: number;
        shouldContinue: boolean;
        responseText: string | undefined;
        error: string | undefined;
        debugMeta: {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined;
        routingDecision: import("../states/chat.state.js").RoutingDecision | undefined;
        subgraphResults: import("../states/chat.state.js").SubgraphResults | undefined;
        userProfile: unknown;
    }, {
        userId?: string | undefined;
        indexId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        sessionId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        messages?: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]> | undefined;
        iterationCount?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        shouldContinue?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        responseText?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        debugMeta?: {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | import("@langchain/langgraph").OverwriteValue<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined> | undefined;
        routingDecision?: import("../states/chat.state.js").RoutingDecision | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").RoutingDecision | undefined> | undefined;
        subgraphResults?: import("../states/chat.state.js").SubgraphResults | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").SubgraphResults | undefined> | undefined;
        userProfile?: unknown;
    }, "__start__" | "agent_loop", {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        sessionId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
        iterationCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        shouldContinue: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        responseText: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        debugMeta: import("@langchain/langgraph").BaseChannel<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined, {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | import("@langchain/langgraph").OverwriteValue<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined> | undefined, unknown>;
        routingDecision: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").RoutingDecision | undefined, import("../states/chat.state.js").RoutingDecision | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").RoutingDecision | undefined> | undefined, unknown>;
        subgraphResults: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").SubgraphResults | undefined, import("../states/chat.state.js").SubgraphResults | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").SubgraphResults | undefined> | undefined, unknown>;
        userProfile: import("@langchain/langgraph").BaseChannel<unknown, unknown, unknown>;
    }, {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        sessionId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
        iterationCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        shouldContinue: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        responseText: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        debugMeta: import("@langchain/langgraph").BaseChannel<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined, {
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | import("@langchain/langgraph").OverwriteValue<{
            graph: string;
            iterations: number;
            tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
        } | undefined> | undefined, unknown>;
        routingDecision: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").RoutingDecision | undefined, import("../states/chat.state.js").RoutingDecision | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").RoutingDecision | undefined> | undefined, unknown>;
        subgraphResults: import("@langchain/langgraph").BaseChannel<import("../states/chat.state.js").SubgraphResults | undefined, import("../states/chat.state.js").SubgraphResults | import("@langchain/langgraph").OverwriteValue<import("../states/chat.state.js").SubgraphResults | undefined> | undefined, unknown>;
        userProfile: import("@langchain/langgraph").BaseChannel<unknown, unknown, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        agent_loop: {
            messages: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[];
            responseText: string;
            iterationCount: number;
            shouldContinue: boolean;
            debugMeta: {
                graph: string;
                iterations: number;
                tools: import("../types/chat-streaming.types.js").DebugMetaToolCall[];
            };
            error?: undefined;
        } | {
            error: string;
            responseText: string;
            shouldContinue: boolean;
            messages?: undefined;
            iterationCount?: undefined;
            debugMeta?: undefined;
        };
    }, unknown, unknown>;
    /**
     * Load previous messages from a session and convert to LangChain messages.
     * Handles token truncation to fit within context window limits.
     *
     * @param sessionId - The session ID to load context from
     * @param maxMessages - Maximum number of messages to load (default: 20)
     * @returns Array of LangChain BaseMessage objects
     */
    loadSessionContext(sessionId: string, maxMessages?: number): Promise<BaseMessage[]>;
    /**
     * Streams chat events with full session context.
     * Delegates to ChatGraphStreamingService.
     */
    streamChatEventsWithContext(input: {
        userId: string;
        message: string;
        sessionId: string;
        maxContextMessages?: number;
        indexId?: string;
        prefillMessages?: Array<{
            role: "assistant" | "user";
            content: string;
        }>;
    }, checkpointer?: MemorySaver | PostgresSaver, signal?: AbortSignal): AsyncGenerator<import("../types/chat-streaming.types.js").ChatStreamEvent, void, any>;
    /**
     * Streams chat events from the graph execution.
     * Delegates to ChatGraphStreamingService.
     */
    streamChatEvents(input: {
        userId: string;
        messages: BaseMessage[];
    }, sessionId: string, checkpointer?: MemorySaver | PostgresSaver, signal?: AbortSignal): AsyncGenerator<import("../types/chat-streaming.types.js").ChatStreamEvent, void, any>;
    /**
     * Internal method to build the graph structure.
     * @returns Uncompiled StateGraph
     */
    private buildGraph;
}
//# sourceMappingURL=chat.graph.d.ts.map