import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
/**
 * Options to control inferrer behavior.
 * Used to implement safety controls for read/write separation.
 */
export interface InferrerOptions {
    /**
     * Whether to fallback to profile inference when content is empty.
     * Should be TRUE for create operations without explicit content.
     * Should be FALSE for query operations.
     * Default: true (for backward compatibility).
     */
    allowProfileFallback?: boolean;
    /**
     * The operation mode for context.
     * Helps inferrer understand the user's intent.
     */
    operationMode?: 'create' | 'update' | 'delete';
    /**
     * Conversation history for anaphoric resolution.
     * Used to resolve references like "that intent", "this goal", etc.
     * Optional - if not provided, inference uses only current content.
     */
    conversationContext?: BaseMessage[];
}
declare const InferredIntentSchema: z.ZodObject<{
    type: z.ZodEnum<["goal", "tombstone"]>;
    description: z.ZodString;
    reasoning: z.ZodString;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    confidence: "low" | "medium" | "high";
    type: "goal" | "tombstone";
    description: string;
}, {
    reasoning: string;
    confidence: "low" | "medium" | "high";
    type: "goal" | "tombstone";
    description: string;
}>;
export type InferredIntent = z.infer<typeof InferredIntentSchema>;
export declare class ExplicitIntentInferrer {
    private model;
    constructor();
    /**
     * Main entry point. Invokes the agent with input and returns structured output.
     * @param content - The raw string content to analyze.
     * @param profileContext - The formatted profile context string.
     * @param options - Options controlling inference behavior (fallback, operation mode, conversation context).
     */
    invoke(content: string | null, profileContext: string, options?: InferrerOptions): Promise<{
        intents: {
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[];
    }>;
    /**
     * Formats conversation history for inclusion in the prompt.
     * Converts BaseMessage[] to readable string format.
     */
    private formatConversationHistory;
    /**
     * Factory method to expose the agent as a LangChain tool.
     * Useful for composing agents into larger graphs.
     */
    static asTool(): import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
        content: z.ZodNullable<z.ZodString>;
        profileContext: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string | null;
        profileContext: string;
    }, {
        content: string | null;
        profileContext: string;
    }>, {
        content: string | null;
        profileContext: string;
    }, {
        content: string | null;
        profileContext: string;
    }, {
        intents: {
            reasoning: string;
            confidence: "low" | "medium" | "high";
            type: "goal" | "tombstone";
            description: string;
        }[];
    }, unknown, "explicit_intent_inferrer">;
}
export {};
//# sourceMappingURL=intent.inferrer.d.ts.map