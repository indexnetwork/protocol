import { z } from "zod";
export declare const IntentIndexerOutputSchema: z.ZodObject<{
    indexScore: z.ZodNumber;
    memberScore: z.ZodNumber;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    indexScore: number;
    memberScore: number;
}, {
    reasoning: string;
    indexScore: number;
    memberScore: number;
}>;
/**
 * Output structure for the Intent Indexer agent.
 */
export type IntentIndexerOutput = z.infer<typeof IntentIndexerOutputSchema>;
export declare class IntentIndexer {
    private model;
    constructor();
    /**
     * Converts the structured response into a string for logging or embedding.
     * Used when the output needs to be serialized (e.g. for traces).
     */
    private toString;
    /**
     * Main entry point. Evaluates the appropriateness of an intent for a given index and member context.
     *
     * @param intent - The intent payload.
     * @param indexPrompt - The purpose of the index (community).
     * @param memberPrompt - The member's sharing preferences (optional).
     * @param sourceName - Optional source name for context (e.g. file, link).
     * @returns Structured output with indexScore, memberScore, and reasoning, or null on error.
     */
    invoke(intent: string, indexPrompt: string | null, memberPrompt: string | null, sourceName?: string | null): Promise<IntentIndexerOutput | null>;
    /**
     * Alias for invoke. Evaluates the appropriateness of an intent for a given index and member context.
     * Kept for compatibility with callers (e.g. Index Graph) that use evaluate().
     */
    evaluate(intent: string, indexPrompt: string | null, memberPrompt: string | null, sourceName?: string | null): Promise<IntentIndexerOutput | null>;
    /**
     * Factory method to expose the agent as a LangChain tool.
     * Useful for composing agents into larger graphs.
     */
    static asTool(): import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
        intent: z.ZodString;
        indexPrompt: z.ZodNullable<z.ZodString>;
        memberPrompt: z.ZodNullable<z.ZodString>;
        sourceName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        intent: string;
        indexPrompt: string | null;
        memberPrompt: string | null;
        sourceName?: string | null | undefined;
    }, {
        intent: string;
        indexPrompt: string | null;
        memberPrompt: string | null;
        sourceName?: string | null | undefined;
    }>, {
        intent: string;
        indexPrompt: string | null;
        memberPrompt: string | null;
        sourceName?: string | null | undefined;
    }, {
        intent: string;
        indexPrompt: string | null;
        memberPrompt: string | null;
        sourceName?: string | null | undefined;
    }, {
        reasoning: string;
        indexScore: number;
        memberScore: number;
    } | null, unknown, "intent_indexer">;
}
//# sourceMappingURL=intent.indexer.d.ts.map