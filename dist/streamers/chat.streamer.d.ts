import { BaseMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type { ChatStreamEvent } from "../types/chat-streaming.types.js";
/**
 * Top-level streaming service for Chat Graph events.
 *
 * Uses `graph.stream()` with `streamMode: ["custom", "updates"]` so that
 * the agent's `config.writer()` calls arrive as `"custom"` chunks (text
 * tokens and tool-activity events) and the final state update arrives as
 * an `"updates"` chunk.
 */
export declare class ChatStreamer {
    private loadSessionContext;
    private createStreamingGraph;
    constructor(loadSessionContext: (sessionId: string, maxMessages: number) => Promise<BaseMessage[]>, createStreamingGraph: (checkpointer?: MemorySaver | PostgresSaver) => any);
    /**
     * Streams chat events with full session context.
     * Loads previous conversation history and optionally uses a checkpointer
     * for state persistence.
     *
     * @param input - Configuration for context-aware streaming
     * @param checkpointer - Optional checkpointer for state persistence
     * @yields ChatStreamEvent objects
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
    }, checkpointer?: MemorySaver | PostgresSaver, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent>;
    /**
     * Streams chat events from the graph execution.
     *
     * Uses `graph.stream()` with `streamMode: ["custom", "updates"]`:
     * - `"custom"` chunks carry {@link AgentStreamEvent} objects emitted by
     *   `ChatAgent.streamRun()` via `config.writer()`
     * - `"updates"` chunks carry the final state update from `agentLoopNode`
     *
     * @param input - The input state for the graph (userId and messages)
     * @param sessionId - The session ID for event attribution
     * @param checkpointer - Optional checkpointer for persistence
     * @yields ChatStreamEvent objects
     */
    streamChatEvents(input: {
        userId: string;
        messages: BaseMessage[];
        indexId?: string;
    }, sessionId: string, checkpointer?: MemorySaver | PostgresSaver, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent>;
}
//# sourceMappingURL=chat.streamer.d.ts.map