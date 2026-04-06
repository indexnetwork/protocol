import type { ChatSuggestion } from "../types/chat-streaming.types.js";
export interface SuggestionGeneratorInput {
    /** Last few messages (user and assistant) to derive context */
    messages: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    /** Optional index/community context to tailor suggestions */
    indexContext?: string;
}
/**
 * Lightweight generator for context-aware chat follow-up suggestions.
 * Uses a fast model and structured output to return 3-5 suggestions per call.
 */
export declare class SuggestionGenerator {
    private model;
    constructor();
    /**
     * Generate follow-up suggestions from the last exchange.
     * Returns empty array on failure (graceful degradation).
     */
    generate(input: SuggestionGeneratorInput): Promise<ChatSuggestion[]>;
}
//# sourceMappingURL=suggestion.generator.d.ts.map