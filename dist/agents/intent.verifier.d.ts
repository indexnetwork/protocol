import { z } from "zod";
declare const responseFormat: z.ZodObject<{
    reasoning: z.ZodString;
    classification: z.ZodEnum<["COMMISSIVE", "DIRECTIVE", "ASSERTIVE", "EXPRESSIVE", "DECLARATION", "UNKNOWN"]>;
    felicity_scores: z.ZodObject<{
        clarity: z.ZodNumber;
        authority: z.ZodNumber;
        sincerity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        clarity: number;
        authority: number;
        sincerity: number;
    }, {
        clarity: number;
        authority: number;
        sincerity: number;
    }>;
    semantic_entropy: z.ZodNumber;
    referential_anchor: z.ZodNullable<z.ZodString>;
    flags: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    classification: "COMMISSIVE" | "DIRECTIVE" | "ASSERTIVE" | "EXPRESSIVE" | "DECLARATION" | "UNKNOWN";
    felicity_scores: {
        clarity: number;
        authority: number;
        sincerity: number;
    };
    semantic_entropy: number;
    referential_anchor: string | null;
    flags: string[];
}, {
    reasoning: string;
    classification: "COMMISSIVE" | "DIRECTIVE" | "ASSERTIVE" | "EXPRESSIVE" | "DECLARATION" | "UNKNOWN";
    felicity_scores: {
        clarity: number;
        authority: number;
        sincerity: number;
    };
    semantic_entropy: number;
    referential_anchor: string | null;
    flags: string[];
}>;
export type SemanticVerifierOutput = z.infer<typeof responseFormat>;
export declare class SemanticVerifier {
    private model;
    constructor();
    /**
     * Verifies the semantic validity of an intent.
     * @param content - The user's raw utterance.
     * @param context - The User Profile as a JSON string.
     */
    invoke(content: string, context: string): Promise<{
        reasoning: string;
        classification: "COMMISSIVE" | "DIRECTIVE" | "ASSERTIVE" | "EXPRESSIVE" | "DECLARATION" | "UNKNOWN";
        felicity_scores: {
            clarity: number;
            authority: number;
            sincerity: number;
        };
        semantic_entropy: number;
        referential_anchor: string | null;
        flags: string[];
    }>;
    /**
     * Factory method to expose the agent as a LangChain tool.
     */
    static asTool(): import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
        content: z.ZodString;
        context: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        context: string;
        content: string;
    }, {
        context: string;
        content: string;
    }>, {
        context: string;
        content: string;
    }, {
        context: string;
        content: string;
    }, {
        reasoning: string;
        classification: "COMMISSIVE" | "DIRECTIVE" | "ASSERTIVE" | "EXPRESSIVE" | "DECLARATION" | "UNKNOWN";
        felicity_scores: {
            clarity: number;
            authority: number;
            sincerity: number;
        };
        semantic_entropy: number;
        referential_anchor: string | null;
        flags: string[];
    }, unknown, "semantic_verifier">;
}
export {};
//# sourceMappingURL=intent.verifier.d.ts.map