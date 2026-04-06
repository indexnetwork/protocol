import { StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { ChatGraphState } from "../states/chat.state";
import { ChatAgent } from "../agents/chat.agent";
import { protocolLogger } from "../support/protocol.logger";
import { truncateToTokenLimit, MAX_CONTEXT_TOKENS } from "../support/chat.utils";
import { ChatStreamer } from "../streamers";
import { timed } from "../support/performance";
const logger = protocolLogger("ChatGraphFactory");
function isRetriableError(err) {
    const status = err.status ?? err.statusCode;
    if (typeof status === "number" && status >= 500 && status <= 599)
        return true;
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    return (lower.includes("internal server error") ||
        /\b500\b|status[: ]*500/i.test(msg) ||
        lower.includes("econnreset") ||
        lower.includes("etimedout"));
}
const RETRY_DELAY_MS = 800;
// ══════════════════════════════════════════════════════════════════════════════
// CHAT GRAPH FACTORY (Agent Loop Architecture)
// ══════════════════════════════════════════════════════════════════════════════
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
export class ChatGraphFactory {
    constructor(database, embedder, scraper, chatSession, protocolDeps) {
        this.database = database;
        this.embedder = embedder;
        this.scraper = scraper;
        this.chatSession = chatSession;
        this.protocolDeps = protocolDeps;
        this.streamingService = new ChatStreamer((sessionId, maxMessages) => this.loadSessionContext(sessionId, maxMessages), (checkpointer) => this.createStreamingGraph(checkpointer));
    }
    /**
     * Creates and compiles the Chat Graph without persistence.
     * @returns Compiled StateGraph ready for invocation
     */
    createGraph() {
        return this.buildGraph().compile();
    }
    /**
     * Creates a streaming-enabled graph with optional checkpointer for persistence.
     * @param checkpointer - Optional checkpointer (e.g., MemorySaver or PostgresSaver)
     * @returns Compiled StateGraph ready for streaming
     */
    createStreamingGraph(checkpointer) {
        const graph = this.buildGraph();
        if (checkpointer) {
            return graph.compile({ checkpointer });
        }
        return graph.compile();
    }
    /**
     * Load previous messages from a session and convert to LangChain messages.
     * Handles token truncation to fit within context window limits.
     *
     * @param sessionId - The session ID to load context from
     * @param maxMessages - Maximum number of messages to load (default: 20)
     * @returns Array of LangChain BaseMessage objects
     */
    async loadSessionContext(sessionId, maxMessages = 20) {
        logger.verbose("Loading session context", {
            sessionId,
            maxMessages,
        });
        try {
            const messages = await this.chatSession.getSessionMessages(sessionId, maxMessages);
            if (messages.length === 0) {
                logger.verbose("No previous messages found", { sessionId });
                return [];
            }
            // Convert database messages to LangChain format
            const langchainMessages = messages.map((msg) => {
                if (msg.role === "user") {
                    return new HumanMessage(msg.content);
                }
                else if (msg.role === "assistant") {
                    return new HumanMessage(msg.content); // Using HumanMessage to avoid circular dependency
                }
                else {
                    return new HumanMessage(msg.content);
                }
            });
            // Truncate to fit within token limits
            const truncatedMessages = truncateToTokenLimit(langchainMessages, MAX_CONTEXT_TOKENS);
            logger.verbose("Context loaded", {
                sessionId,
                originalCount: messages.length,
                truncatedCount: truncatedMessages.length,
            });
            return truncatedMessages;
        }
        catch (error) {
            logger.error("Failed to load context", {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
            });
            // Return empty array on error - don't fail the entire request
            return [];
        }
    }
    /**
     * Streams chat events with full session context.
     * Delegates to ChatGraphStreamingService.
     */
    async *streamChatEventsWithContext(input, checkpointer, signal) {
        yield* this.streamingService.streamChatEventsWithContext(input, checkpointer, signal);
    }
    /**
     * Streams chat events from the graph execution.
     * Delegates to ChatGraphStreamingService.
     */
    async *streamChatEvents(input, sessionId, checkpointer, signal) {
        yield* this.streamingService.streamChatEvents(input, sessionId, checkpointer, signal);
    }
    /**
     * Internal method to build the graph structure.
     * @returns Uncompiled StateGraph
     */
    buildGraph() {
        const database = this.database;
        const embedder = this.embedder;
        const scraper = this.scraper;
        const protocolDeps = this.protocolDeps;
        // ─────────────────────────────────────────────────────────────────────────
        // AGENT LOOP NODE
        // ─────────────────────────────────────────────────────────────────────────
        /**
         * The main agent loop node.
         * Runs a ReAct-style agent that calls tools until it decides to respond.
         *
         * Uses `agent.streamRun()` + `config.writer` so that text tokens and
         * tool-activity events are pushed into the graph's custom stream in
         * real-time rather than batched at the end.
         */
        const agentLoopNode = async (state, config) => {
            return timed("ChatGraph.agentLoop", async () => {
                logger.verbose("Agent loop starting", {
                    userId: state.userId,
                    messageCount: state.messages.length,
                    currentIteration: state.iterationCount
                });
                const runLoop = async () => {
                    const indexId = state.indexId;
                    const agent = await ChatAgent.create({
                        ...protocolDeps,
                        userId: state.userId,
                        database,
                        embedder,
                        scraper,
                        indexId,
                        sessionId: state.sessionId,
                    });
                    // Direct streaming writer - emit events immediately instead of buffering
                    const directWriter = (data) => {
                        try {
                            config.writer?.(data);
                        }
                        catch {
                            /* swallow if writer is gone */
                        }
                    };
                    // Get signal from configurable (passed by streamer via graph.stream() config)
                    const signal = config.configurable?.signal;
                    const result = await agent.streamRun(state.messages, directWriter, signal);
                    return result;
                };
                try {
                    const result = await runLoop();
                    logger.debug("Agent streamRun result", {
                        responseText: result.responseText,
                        iterationCount: result.iterationCount,
                        messageCount: result.messages.length,
                    });
                    logger.verbose("Agent loop complete", {
                        userId: state.userId,
                        iterations: result.iterationCount,
                        responseLength: result.responseText.length
                    });
                    return {
                        messages: result.messages,
                        responseText: result.responseText,
                        iterationCount: result.iterationCount,
                        shouldContinue: false,
                        debugMeta: result.debugMeta,
                    };
                }
                catch (error) {
                    if (isRetriableError(error)) {
                        const signal = config.configurable?.signal;
                        if (signal?.aborted) {
                            return {
                                error: "Request aborted",
                                responseText: "",
                                shouldContinue: false,
                            };
                        }
                        logger.warn("Agent loop failed with retriable error, retrying once", {
                            userId: state.userId,
                            error: error instanceof Error ? error.message : String(error)
                        });
                        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
                        try {
                            const result = await runLoop();
                            logger.verbose("Agent loop complete after retry", {
                                userId: state.userId,
                                iterations: result.iterationCount,
                            });
                            return {
                                messages: result.messages,
                                responseText: result.responseText,
                                iterationCount: result.iterationCount,
                                shouldContinue: false,
                                debugMeta: result.debugMeta,
                            };
                        }
                        catch (retryError) {
                            logger.error("Agent loop failed on retry", {
                                userId: state.userId,
                                error: retryError instanceof Error ? retryError.message : String(retryError)
                            });
                            return {
                                error: retryError instanceof Error ? retryError.message : "Agent loop failed",
                                responseText: "I apologize, but I encountered an issue processing your request. Please try again.",
                                shouldContinue: false
                            };
                        }
                    }
                    logger.error("Agent loop failed", {
                        userId: state.userId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    return {
                        error: error instanceof Error ? error.message : "Agent loop failed",
                        responseText: "I apologize, but I encountered an issue processing your request. Please try again.",
                        shouldContinue: false
                    };
                }
            });
        };
        // ─────────────────────────────────────────────────────────────────────────
        // GRAPH ASSEMBLY
        // ─────────────────────────────────────────────────────────────────────────
        const workflow = new StateGraph(ChatGraphState)
            .addNode("agent_loop", agentLoopNode)
            .addEdge(START, "agent_loop")
            .addEdge("agent_loop", END);
        logger.verbose("Graph built successfully (agent loop architecture)");
        return workflow;
    }
}
//# sourceMappingURL=chat.graph.js.map