import { Annotation, messagesStateReducer } from "@langchain/langgraph";
// ══════════════════════════════════════════════════════════════════════════════
// CHAT GRAPH STATE (Agent Loop Architecture)
// ══════════════════════════════════════════════════════════════════════════════
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
export const ChatGraphState = Annotation.Root({
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE INPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * The User ID - required for all operations.
     */
    userId: (Annotation),
    /**
     * Optional index (community) ID when chat is scoped to a specific index.
     * When set, the agent and tools use this as the current index (e.g. read_intents,
     * create_intent with indexId, scope index assignment to this index only).
     */
    indexId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /**
     * Chat session ID when streaming with context. Used by tools to create draft
     * opportunities tied to this conversation (context.conversationId).
     */
    sessionId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => undefined,
    }),
    /**
     * Conversation history using LangGraph's built-in message reducer.
     * Includes: HumanMessage, AIMessage, ToolMessage, SystemMessage
     * Automatically handles message appending, ID management, and ordering.
     */
    messages: Annotation({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    // ═══════════════════════════════════════════════════════════════════════════
    // LOOP CONTROL
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Current iteration count in the agent loop.
     * Used for soft limit (nudge) and hard limit (force exit).
     */
    iterationCount: Annotation({
        reducer: (curr, next) => next,
        default: () => 0,
    }),
    /**
     * Flag indicating whether the agent loop should continue.
     * Set to false when agent produces final response or hits hard limit.
     */
    shouldContinue: Annotation({
        reducer: (curr, next) => next,
        default: () => true,
    }),
    // ═══════════════════════════════════════════════════════════════════════════
    // OUTPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * The final generated response text.
     * Set when the agent decides to stop and respond.
     */
    responseText: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /**
     * Error message if the agent loop fails.
     */
    error: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /**
     * Per-turn debug meta (graph, iterations, tool calls) for copy-debug.
     * Not persisted; only used so the streamer receives it in the updates chunk.
     */
    debugMeta: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    // Legacy subgraph state (used by index/intent/response nodes when present)
    /** Router output: target, operationType, extractedContext. */
    routingDecision: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /** Results from intent/profile/opportunity/scrape subgraphs. */
    subgraphResults: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
    /** User profile context (e.g. for intent nodes). */
    userProfile: Annotation({
        reducer: (curr, next) => next,
        default: () => undefined,
    }),
});
//# sourceMappingURL=chat.state.js.map