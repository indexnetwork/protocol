/**
 * Token utilities for context window management.
 * Estimates token counts and truncates message arrays to fit within model limits.
 * Uses a simple heuristic (~4 chars per token for English).
 */
import { BaseMessage } from "@langchain/core/messages";
/**
 * Default maximum tokens to allow for context.
 * Reserves space for system prompt and response generation.
 */
export declare const MAX_CONTEXT_TOKENS = 8000;
/**
 * Estimate token count for a string using a simple heuristic.
 *
 * This uses a rough estimate of ~4 characters per token, which works
 * reasonably well for English text. For more accuracy with specific
 * models, use tiktoken or the model's native tokenizer.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export declare function estimateTokenCount(text: string): number;
/**
 * Estimate token count for a message, including role overhead.
 *
 * @param message - The LangChain message to estimate
 * @returns Estimated token count including message overhead
 */
export declare function estimateMessageTokens(message: BaseMessage): number;
/**
 * Truncate messages to fit within token limit, keeping most recent messages.
 *
 * Messages are processed from newest to oldest, accumulating until the
 * token limit is reached. The first message (usually system) is always
 * kept if present.
 *
 * @param messages - Array of messages to truncate
 * @param maxTokens - Maximum total tokens allowed (default: MAX_CONTEXT_TOKENS)
 * @returns Array of messages that fit within the token limit
 */
export declare function truncateToTokenLimit(messages: BaseMessage[], maxTokens?: number): BaseMessage[];
//# sourceMappingURL=chat.utils.d.ts.map