var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { log } from "../support/log";
import { Timed } from "../support/performance";
import { createModel } from "./model.config";
// ──────────────────────────────────────────────────────────────
// Response schema
// ──────────────────────────────────────────────────────────────
export const IntentIndexerOutputSchema = z.object({
    indexScore: z.number().min(0).max(1).describe("Score for index appropriateness (0.0-1.0)"),
    memberScore: z.number().min(0).max(1).describe("Score for member preference match (0.0-1.0)"),
    reasoning: z.string().describe("Brief reasoning for the scores"),
});
const logger = log.lib.from("IntentIndexer");
/**
 * Config
 */
import { config } from "dotenv";
config({ path: ".env.development", override: true });
const model = createModel("intentIndexer");
// ──────────────────────────────────────────────────────────────
// 1. SYSTEM PROMPT
// ──────────────────────────────────────────────────────────────
const systemPrompt = `
You are an expert Intent Evaluator for a social networking protocol.

TASK:
Determine if a User Intent is appropriate for a specific Index (community) and matches a Member's sharing preferences.

INPUTS:
1. Intent: The content/action the user wants to perform.
2. Index Prompt: The purpose/scope of the target community (Index).
3. Member Prompt: The specific sharing preferences of the user in that community (optional).
4. Source: Origin of the intent (file, link, etc.) (optional).

SCORING RUBRIC:
- 0.9-1.0: Highly appropriate, perfect match.
- 0.7-0.8: Good match, relevant.
- 0.5-0.6: Moderate, borderline.
- 0.3-0.4: Low appropriateness, poor fit.
- 0.0-0.2: Not appropriate.

OUTPUT RULES:
- Provide \`indexScore\` based on how well the Intent fits the Index Prompt.
- Provide \`memberScore\` based on how well the Intent fits the Member Prompt (if provided). If Member Prompt is missing/empty, return 0.0 for memberScore.
- Provide concise \`reasoning\`.
`;
// ──────────────────────────────────────────────────────────────
// 2. RESPONSE SCHEMA (Zod)
// ──────────────────────────────────────────────────────────────
const responseFormat = IntentIndexerOutputSchema;
// ──────────────────────────────────────────────────────────────
// 4. CLASS DEFINITION
// ──────────────────────────────────────────────────────────────
export class IntentIndexer {
    constructor() {
        this.model = model.withStructuredOutput(responseFormat, {
            name: "intent_indexer",
        });
    }
    /**
     * Converts the structured response into a string for logging or embedding.
     * Used when the output needs to be serialized (e.g. for traces).
     */
    toString(output) {
        return [
            `indexScore: ${output.indexScore}`,
            `memberScore: ${output.memberScore}`,
            `reasoning: ${output.reasoning}`,
        ].join("\n");
    }
    /**
     * Main entry point. Evaluates the appropriateness of an intent for a given index and member context.
     *
     * @param intent - The intent payload.
     * @param indexPrompt - The purpose of the index (community).
     * @param memberPrompt - The member's sharing preferences (optional).
     * @param sourceName - Optional source name for context (e.g. file, link).
     * @returns Structured output with indexScore, memberScore, and reasoning, or null on error.
     */
    async invoke(intent, indexPrompt, memberPrompt, sourceName) {
        logger.verbose("[IntentIndexer.invoke] Evaluating intent");
        const contextParts = [];
        if (sourceName)
            contextParts.push(`Source: ${sourceName}`);
        contextParts.push(indexPrompt ? `Index Purpose: ${indexPrompt}` : "Index Purpose: (Not provided)");
        contextParts.push(memberPrompt ? `Member Preferences: ${memberPrompt}` : "Member Preferences: (Not provided)");
        const prompt = `
      # Context
      ${contextParts.join("\n")}

      # Intent
      ${intent}

      Evaluate the appropriateness of this intent.
    `;
        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(prompt),
        ];
        try {
            const result = await this.model.invoke(messages);
            const output = responseFormat.parse(result);
            logger.verbose("[IntentIndexer.invoke] Evaluation complete", {
                indexScore: output.indexScore,
                memberScore: output.memberScore,
            });
            return output;
        }
        catch (error) {
            logger.error("[IntentIndexer] Error during execution", { error });
            return null;
        }
    }
    /**
     * Alias for invoke. Evaluates the appropriateness of an intent for a given index and member context.
     * Kept for compatibility with callers (e.g. Index Graph) that use evaluate().
     */
    async evaluate(intent, indexPrompt, memberPrompt, sourceName) {
        return this.invoke(intent, indexPrompt, memberPrompt, sourceName);
    }
    /**
     * Factory method to expose the agent as a LangChain tool.
     * Useful for composing agents into larger graphs.
     */
    static asTool() {
        return tool(async (args) => {
            const agent = new IntentIndexer();
            return await agent.invoke(args.intent, args.indexPrompt, args.memberPrompt, args.sourceName);
        }, {
            name: "intent_indexer",
            description: "Evaluates whether an intent is appropriate for a specific index (community) and matches member sharing preferences.",
            schema: z.object({
                intent: z.string().describe("The intent payload to evaluate"),
                indexPrompt: z.string().nullable().describe("The purpose of the index (community)"),
                memberPrompt: z.string().nullable().describe("The member's sharing preferences"),
                sourceName: z.string().nullable().optional().describe("Optional source name for context"),
            }),
        });
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], IntentIndexer.prototype, "invoke", null);
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], IntentIndexer.prototype, "evaluate", null);
//# sourceMappingURL=intent.indexer.js.map