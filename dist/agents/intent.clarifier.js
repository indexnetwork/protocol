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
import { z } from "zod";
import { protocolLogger } from "../support/protocol.logger";
import { Timed } from "../support/performance";
import { createModel } from "./model.config";
const logger = protocolLogger("IntentClarifier");
const clarificationSchema = z.object({
    needsClarification: z.boolean(),
    reason: z.string(),
    suggestedDescription: z.string().nullable(),
    clarificationMessage: z.string().nullable(),
});
const suggestionSchema = z.object({
    suggestedDescription: z.string(),
});
const clarificationDraftSchema = z.object({
    suggestedDescription: z.string(),
    clarificationMessage: z.string(),
});
const systemPrompt = `
You evaluate whether an intent is specific enough to persist without asking the user to confirm a refinement.

Only set needsClarification=true when the intent is truly vague — e.g. a single generic phrase with no role, domain, location, or other concrete criteria (like "find a job", "I need help", "looking for something").

Do NOT ask for clarification when the user has already given:
- A role or type (e.g. "UX designer", "technical co-founder", "engineer")
- A domain or industry (e.g. "in AI", "climate tech", "fintech")
- A location or format (e.g. "remote", "Berlin", "full-time")
- Any other concrete detail that makes the intent actionable

Default to needsClarification=false when in doubt. Only clarify when the intent is so broad that persisting it as-is would be unhelpful (e.g. literally "a job" or "something" with no other signal).

Rules when needsClarification=true:
- User Profile is the primary source for suggestedDescription; Active Intents are secondary.
- You MUST provide a concrete suggestedDescription and short clarificationMessage.
- Do not include JSON in clarificationMessage.
`;
const suggestionPrompt = `
You generate one concrete, specific intent rewrite.

Rules:
- Output only a concise intent sentence in suggestedDescription.
- Use profile as primary source of personalization.
- Use active intents as secondary context for consistency.
- Keep user intent meaning, but make it actionable and specific.
- Never return an empty suggestion.
`;
const clarificationDraftPrompt = `
You draft a concise clarification response for a vague intent.

Rules:
- Return both:
  1) suggestedDescription (specific rewritten intent)
  2) clarificationMessage (single short message to the user)
- clarificationMessage must include the suggestion naturally and ask for confirmation.
- Use this shape: ` + "`Did you mean: \"<suggestedDescription>\"?`" + ` followed by a brief confirmation instruction.
- Keep it short. No bullet lists. No JSON.
`;
export class IntentClarifier {
    constructor() {
        const baseModel = createModel("intentClarifier");
        this.model = baseModel.withStructuredOutput(clarificationSchema, {
            name: "intent_clarifier",
        });
        this.suggestionModel = baseModel.withStructuredOutput(suggestionSchema, {
            name: "intent_clarifier_suggestion",
        });
        this.clarificationDraftModel = baseModel.withStructuredOutput(clarificationDraftSchema, { name: "intent_clarifier_message" });
    }
    async invoke(description, profileContext, activeIntentsContext) {
        try {
            const prompt = `
# User Input Intent
${description}

# User Profile
${profileContext || "none"}

# Active Intents
${activeIntentsContext || "none"}
`;
            const result = await this.model.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(prompt),
            ]);
            const parsed = clarificationSchema.parse(result);
            if (parsed.needsClarification) {
                // Always prefer a dedicated rewrite pass for vague inputs so we avoid generic follow-up text.
                const draft = await this.generateClarificationDraft(description, profileContext, activeIntentsContext);
                if (draft) {
                    return {
                        ...parsed,
                        suggestedDescription: draft.suggestedDescription,
                        clarificationMessage: draft.clarificationMessage,
                    };
                }
            }
            return parsed;
        }
        catch (error) {
            logger.warn("invoke: clarification failed", { error });
            return {
                needsClarification: false,
                reason: "fallback_on_model_error",
                suggestedDescription: null,
                clarificationMessage: null,
            };
        }
    }
    async generateSuggestion(description, profileContext, activeIntentsContext) {
        try {
            const prompt = `
# User Input Intent
${description}

# User Profile
${profileContext || "none"}

# Active Intents
${activeIntentsContext || "none"}
`;
            const output = await this.suggestionModel.invoke([
                new SystemMessage(suggestionPrompt),
                new HumanMessage(prompt),
            ]);
            const parsed = suggestionSchema.parse(output);
            const suggestion = parsed.suggestedDescription.trim();
            return suggestion.length > 0 ? suggestion : null;
        }
        catch (error) {
            logger.warn("generateSuggestion: failed", { error });
            return null;
        }
    }
    async generateClarificationDraft(description, profileContext, activeIntentsContext) {
        try {
            const prompt = `
# User Input Intent
${description}

# User Profile
${profileContext || "none"}

# Active Intents
${activeIntentsContext || "none"}
`;
            const output = await this.clarificationDraftModel.invoke([
                new SystemMessage(clarificationDraftPrompt),
                new HumanMessage(prompt),
            ]);
            const parsed = clarificationDraftSchema.parse(output);
            const suggestedDescription = parsed.suggestedDescription.trim();
            const clarificationMessage = parsed.clarificationMessage.trim();
            if (!suggestedDescription || !clarificationMessage)
                return null;
            return { suggestedDescription, clarificationMessage };
        }
        catch (error) {
            logger.warn("generateClarificationDraft: failed", { error });
            const suggestion = await this.generateSuggestion(description, profileContext, activeIntentsContext);
            if (!suggestion)
                return null;
            const clarificationMessage = `Do you mean: ${suggestion}?`;
            return {
                suggestedDescription: suggestion,
                clarificationMessage,
            };
        }
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], IntentClarifier.prototype, "invoke", null);
//# sourceMappingURL=intent.clarifier.js.map