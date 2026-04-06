import { z } from "zod";
declare const clarificationSchema: z.ZodObject<{
    needsClarification: z.ZodBoolean;
    reason: z.ZodString;
    suggestedDescription: z.ZodNullable<z.ZodString>;
    clarificationMessage: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    needsClarification: boolean;
    suggestedDescription: string | null;
    clarificationMessage: string | null;
}, {
    reason: string;
    needsClarification: boolean;
    suggestedDescription: string | null;
    clarificationMessage: string | null;
}>;
export type IntentClarifierOutput = z.infer<typeof clarificationSchema>;
export declare class IntentClarifier {
    private readonly model;
    private readonly suggestionModel;
    private readonly clarificationDraftModel;
    constructor();
    invoke(description: string, profileContext: string, activeIntentsContext: string): Promise<IntentClarifierOutput>;
    private generateSuggestion;
    private generateClarificationDraft;
}
export {};
//# sourceMappingURL=intent.clarifier.d.ts.map