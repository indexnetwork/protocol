import { createTokenEvent, createErrorEvent, } from "../types/chat-streaming.types";
import { protocolLogger } from "../support/protocol.logger";
const logger = protocolLogger("ResponseStreamer");
// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE STREAMER
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Streams the final response from the chat agent.
 *
 * Processes the `on_chain_end` event emitted by the `agent_loop` node and
 * yields either a token event (with the full response text) or an error event.
 *
 * Note on token streaming:
 * We do NOT emit from `on_chat_model_stream` because `streamEvents` yields
 * events from ALL model invocations, including nested ones
 * (ExplicitIntentInferrer, SemanticVerifier, IntentReconciler, IntentIndexer)
 * inside tools. Those emit structured JSON that must not reach the user. The
 * chat agent uses `model.invoke()` so we don't get token-by-token streaming
 * anyway. We only emit the clean final response from `on_chain_end`.
 */
export class ResponseStreamer {
    /**
     * Processes an `on_chain_end` event whose name is `agent_loop`.
     *
     * @returns An array of stream events to yield (token and/or error), plus
     *          metadata for the caller to log.
     */
    handleAgentLoopEnd(sessionId, event) {
        const output = event.data?.output;
        const responseText = typeof output?.responseText === "string" ? output.responseText : "";
        const agentError = typeof output?.error === "string" ? output.error : undefined;
        logger.debug("Agent loop output", { output, responseText, agentError });
        const events = [];
        if (agentError) {
            logger.warn("Agent loop returned error", { agentError });
            events.push(createErrorEvent(sessionId, agentError === "JSON error injected into SSE stream"
                ? "The response could not be sent correctly. Please try again."
                : agentError, "AGENT_ERROR"));
        }
        if (responseText) {
            events.push(createTokenEvent(sessionId, responseText));
        }
        return { events, responseText, hadError: !!agentError };
    }
}
//# sourceMappingURL=response.streamer.js.map