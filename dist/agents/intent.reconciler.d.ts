import { z } from "zod";
declare const CreateIntentActionSchema: z.ZodObject<{
    type: z.ZodUnion<[z.ZodLiteral<"create">, z.ZodLiteral<"CREATE">]>;
    payload: z.ZodString;
    score: z.ZodNullable<z.ZodNumber>;
    reasoning: z.ZodNullable<z.ZodString>;
    intentMode: z.ZodNullable<z.ZodEnum<["REFERENTIAL", "ATTRIBUTIVE"]>>;
    referentialAnchor: z.ZodNullable<z.ZodString>;
    semanticEntropy: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reasoning: string | null;
    payload: string;
    semanticEntropy: number | null;
    referentialAnchor: string | null;
    intentMode: "REFERENTIAL" | "ATTRIBUTIVE" | null;
    type: "create" | "CREATE";
    score: number | null;
}, {
    reasoning: string | null;
    payload: string;
    semanticEntropy: number | null;
    referentialAnchor: string | null;
    intentMode: "REFERENTIAL" | "ATTRIBUTIVE" | null;
    type: "create" | "CREATE";
    score: number | null;
}>;
declare const UpdateIntentActionSchema: z.ZodObject<{
    type: z.ZodUnion<[z.ZodLiteral<"update">, z.ZodLiteral<"UPDATE">]>;
    id: z.ZodString;
    payload: z.ZodString;
    score: z.ZodNullable<z.ZodNumber>;
    reasoning: z.ZodNullable<z.ZodString>;
    intentMode: z.ZodNullable<z.ZodEnum<["REFERENTIAL", "ATTRIBUTIVE"]>>;
}, "strip", z.ZodTypeAny, {
    reasoning: string | null;
    id: string;
    payload: string;
    intentMode: "REFERENTIAL" | "ATTRIBUTIVE" | null;
    type: "update" | "UPDATE";
    score: number | null;
}, {
    reasoning: string | null;
    id: string;
    payload: string;
    intentMode: "REFERENTIAL" | "ATTRIBUTIVE" | null;
    type: "update" | "UPDATE";
    score: number | null;
}>;
declare const ExpireIntentActionSchema: z.ZodObject<{
    type: z.ZodUnion<[z.ZodLiteral<"expire">, z.ZodLiteral<"EXPIRE">]>;
    id: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "expire" | "EXPIRE";
    reason: string;
}, {
    id: string;
    type: "expire" | "EXPIRE";
    reason: string;
}>;
export type NormalizedIntentAction = Omit<z.infer<typeof CreateIntentActionSchema>, "type"> & {
    type: "create";
} | Omit<z.infer<typeof UpdateIntentActionSchema>, "type"> & {
    type: "update";
} | Omit<z.infer<typeof ExpireIntentActionSchema>, "type"> & {
    type: "expire";
};
export type IntentReconcilerOutput = {
    actions: NormalizedIntentAction[];
};
export declare class IntentReconciler {
    private model;
    constructor();
    /**
     * Reconciles inferred intents with active intents.
     * @param inferredIntentsFormatted - Formatted string of inferred intents.
     * @param activeIntentsContext - Formatted string of active intents.
     */
    invoke(inferredIntentsFormatted: string, activeIntentsContext: string): Promise<{
        actions: NormalizedIntentAction[];
    }>;
    /**
     * Factory method to expose the agent as a LangChain tool.
     */
    static asTool(): import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
        inferredIntents: z.ZodString;
        activeIntents: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        inferredIntents: string;
        activeIntents: string;
    }, {
        inferredIntents: string;
        activeIntents: string;
    }>, {
        inferredIntents: string;
        activeIntents: string;
    }, {
        inferredIntents: string;
        activeIntents: string;
    }, {
        actions: NormalizedIntentAction[];
    }, unknown, "intent_reconciler">;
}
export {};
//# sourceMappingURL=intent.reconciler.d.ts.map