/**
 * SSE Event types for Chat Graph streaming.
 *
 * These types define the structure of events sent during streaming chat responses.
 * Events are sent as Server-Sent Events (SSE) with JSON payloads.
 */
/**
 * Formats a chat stream event as an SSE message. If JSON.stringify throws (e.g. circular ref,
 * non-serializable value), returns a minimal error event so the stream stays valid.
 *
 * @param event - The event to format
 * @returns SSE-formatted string with "data: " prefix and double newline
 */
export function formatSSEEvent(event) {
    try {
        return `data: ${JSON.stringify(event)}\n\n`;
    }
    catch (serializeError) {
        const fallback = {
            type: "error",
            sessionId: typeof event.sessionId === "string"
                ? event.sessionId
                : "unknown",
            timestamp: new Date().toISOString(),
            message: "Response could not be serialized. Please try again.",
            code: "SERIALIZATION_ERROR",
        };
        return `data: ${JSON.stringify(fallback)}\n\n`;
    }
}
/**
 * Creates a chat stream event with common fields populated.
 *
 * @param type - Event type
 * @param sessionId - Session ID
 * @param data - Event-specific data (excluding type, sessionId, timestamp)
 * @returns Complete event object
 *
 * @example
 * ```ts
 * const statusEvent = createStreamEvent<StatusEvent>('status', 'session-123', {
 *   message: 'Processing your request...'
 * });
 * ```
 */
export function createStreamEvent(type, sessionId, data) {
    return {
        ...data,
        type,
        sessionId,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Type guard to check if an event is a specific type.
 */
export function isEventType(event, type) {
    return event.type === type;
}
/**
 * Creates a formatted status event.
 */
export function createStatusEvent(sessionId, message) {
    return createStreamEvent("status", sessionId, { message });
}
/**
 * Creates a formatted routing event.
 */
export function createRoutingEvent(sessionId, target, reasoning) {
    return createStreamEvent("routing", sessionId, {
        target,
        reasoning,
    });
}
/**
 * Creates a formatted subgraph start event.
 */
export function createSubgraphStartEvent(sessionId, subgraph) {
    return createStreamEvent("subgraph_start", sessionId, {
        subgraph,
    });
}
/**
 * Creates a formatted subgraph result event.
 */
export function createSubgraphResultEvent(sessionId, subgraph, data) {
    return createStreamEvent("subgraph_result", sessionId, {
        subgraph,
        data,
    });
}
/**
 * Creates a formatted token event.
 */
export function createTokenEvent(sessionId, content) {
    return createStreamEvent("token", sessionId, { content });
}
/**
 * Creates a formatted done event.
 */
export function createDoneEvent(sessionId, response, options) {
    return createStreamEvent("done", sessionId, {
        ...options,
        response,
    });
}
/**
 * Creates a formatted error event.
 */
export function createErrorEvent(sessionId, message, code) {
    return createStreamEvent("error", sessionId, { message, code });
}
/**
 * Creates a formatted thinking event.
 */
export function createThinkingEvent(sessionId, content, step) {
    return createStreamEvent("thinking", sessionId, {
        content,
        step,
    });
}
// ════════════════════════════════════════════════════════════════════════════
// AGENT LOOP EVENT CREATORS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Creates a formatted tool start event.
 */
export function createToolStartEvent(sessionId, toolName, toolArgs) {
    return createStreamEvent("tool_start", sessionId, {
        toolName,
        toolArgs,
    });
}
/**
 * Creates a formatted tool end event.
 */
export function createToolEndEvent(sessionId, toolName, success, resultSummary) {
    return createStreamEvent("tool_end", sessionId, {
        toolName,
        success,
        resultSummary,
    });
}
/**
 * Creates a formatted agent thinking event.
 */
export function createAgentThinkingEvent(sessionId, iteration, toolsUsed) {
    return createStreamEvent("agent_thinking", sessionId, {
        iteration,
        toolsUsed,
    });
}
// ════════════════════════════════════════════════════════════════════════════
// AGENT LOOP TRACE EVENT CREATORS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Creates a formatted iteration start event.
 */
export function createIterationStartEvent(sessionId, iteration) {
    return createStreamEvent("iteration_start", sessionId, {
        iteration,
    });
}
/**
 * Creates a formatted LLM start event.
 */
export function createLlmStartEvent(sessionId, iteration) {
    return createStreamEvent("llm_start", sessionId, {
        iteration,
    });
}
/**
 * Creates a formatted LLM end event.
 */
export function createLlmEndEvent(sessionId, iteration, hasToolCalls, toolNames) {
    return createStreamEvent("llm_end", sessionId, {
        iteration,
        hasToolCalls,
        toolNames,
    });
}
// ════════════════════════════════════════════════════════════════════════════
// STREAMING NARRATION EVENT CREATORS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Creates a formatted tool activity event (inline narration).
 */
export function createToolActivityEvent(sessionId, toolName, description, phase, success, summary, steps) {
    return createStreamEvent("tool_activity", sessionId, {
        toolName,
        description,
        phase,
        success,
        summary,
        steps,
    });
}
// ════════════════════════════════════════════════════════════════════════════
// INTERNAL RESPONSE TRACKING EVENT CREATORS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Creates a formatted response complete event.
 */
export function createResponseCompleteEvent(sessionId, response) {
    return createStreamEvent("response_complete", sessionId, { response });
}
/**
 * Creates a formatted response reset event.
 * Tells the frontend to discard all previously streamed tokens.
 */
export function createResponseResetEvent(sessionId, reason) {
    return createStreamEvent("response_reset", sessionId, { reason });
}
/**
 * Creates a hallucination detected event for the trace panel.
 */
export function createHallucinationDetectedEvent(sessionId, blockType, tool) {
    return createStreamEvent("hallucination_detected", sessionId, { blockType, tool });
}
// ════════════════════════════════════════════════════════════════════════════
// DEBUG META EVENT CREATORS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Creates a formatted debug meta event (per-turn graph and tool usage).
 */
export function createDebugMetaEvent(sessionId, graph, iterations, tools) {
    return createStreamEvent("debug_meta", sessionId, {
        graph,
        iterations,
        tools,
    });
}
// ════════════════════════════════════════════════════════════════════════════
// TRACE HIERARCHY EVENT CREATORS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Creates a graph start event emitted when a LangGraph sub-graph begins inside a tool.
 */
export function createGraphStartEvent(sessionId, graphName) {
    return createStreamEvent("graph_start", sessionId, { graphName });
}
/**
 * Creates a graph end event emitted when a LangGraph sub-graph completes.
 */
export function createGraphEndEvent(sessionId, graphName, durationMs) {
    return createStreamEvent("graph_end", sessionId, { graphName, durationMs });
}
/**
 * Creates an agent start event emitted when an LLM agent begins inside a graph node.
 */
export function createAgentStartEvent(sessionId, agentName) {
    return createStreamEvent("agent_start", sessionId, { agentName });
}
/**
 * Creates an agent end event emitted when an LLM agent completes.
 */
export function createAgentEndEvent(sessionId, agentName, durationMs, summary) {
    return createStreamEvent("agent_end", sessionId, { agentName, durationMs, summary });
}
//# sourceMappingURL=chat-streaming.types.js.map