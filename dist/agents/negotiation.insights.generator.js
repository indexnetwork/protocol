/**
 * Negotiation Insights Generator
 *
 * Produces an aggregated, second-person narrative summarizing a user's
 * negotiation history — topics they're sought for, role patterns,
 * opportunity trends, and interesting signals from recent activity.
 */
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
import { log } from "../support/log";
import { Timed } from "../support/performance";
import { createModel } from "./model.config";
const logger = log.lib.from("NegotiationInsightsGenerator");
const SYSTEM_PROMPT = `You are an analyst summarizing a user's negotiation history on a discovery network.
Agents negotiate on behalf of users to find collaboration opportunities.

Given a digest of past negotiations, write a concise insight paragraph (2-4 sentences) addressed to the user in second person ("you").

Guidelines:
- Be conversational and insightful, not just statistical.
- Highlight what others seek the user for, and what the user tends to seek.
- Mention role patterns: Helper (they assist others), Seeker (they need something), Peer (mutual collaboration).
- Note opportunity rate trends or interesting shifts if apparent.
- Reference specific topics or counterparty names when they form patterns.
- If there are very few negotiations (1-2), keep it brief and forward-looking.
- Do NOT use bullet points or lists. Write flowing prose.
- Do NOT start with "You have" or "Your negotiations". Be more creative.`;
/**
 * Generates an aggregated insight summary from a user's negotiation history.
 * @remarks Lightweight single-call agent; no DB access, no side effects.
 */
export class NegotiationInsightsGenerator {
    constructor() {
        this.model = createModel("negotiationInsights");
    }
    /**
     * Produces a narrative summary from a negotiation digest.
     * @param digest - Pre-computed statistics and excerpts from the user's negotiations
     * @returns A 2-4 sentence insight paragraph, or null on failure
     */
    async invoke(digest) {
        if (digest.totalCount === 0)
            return null;
        const lines = [
            `Total negotiations: ${digest.totalCount}`,
            `Opportunities: ${digest.opportunityCount}, No opportunity: ${digest.noOpportunityCount}, In progress: ${digest.inProgressCount}`,
        ];
        const roles = Object.entries(digest.roleDistribution);
        if (roles.length > 0) {
            lines.push(`Role distribution: ${roles.map(([r, n]) => `${r}: ${n}`).join(", ")}`);
        }
        if (digest.counterparties.length > 0) {
            lines.push(`Counterparties: ${digest.counterparties.join(", ")}`);
        }
        if (digest.reasoningExcerpts.length > 0) {
            lines.push(`Sample reasoning excerpts:\n${digest.reasoningExcerpts.map((r) => `- ${r}`).join("\n")}`);
        }
        const userMessage = `Negotiation digest:\n${lines.join("\n")}\n\nWrite the insight summary:`;
        try {
            const response = await this.model.invoke([
                new SystemMessage(SYSTEM_PROMPT),
                new HumanMessage(userMessage),
            ]);
            let text;
            if (typeof response.content === "string") {
                text = response.content.trim();
            }
            else if (Array.isArray(response.content)) {
                text = response.content
                    .filter((b) => b.type === "text")
                    .map((b) => b.text ?? "")
                    .join("")
                    .trim();
            }
            else {
                text = "";
            }
            if (!text)
                return null;
            logger.verbose("[NegotiationInsightsGenerator.invoke] Insights generated", { length: text.length });
            return text;
        }
        catch (error) {
            logger.warn("[NegotiationInsightsGenerator.invoke] Failed to generate insights", {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NegotiationInsightsGenerator.prototype, "invoke", null);
//# sourceMappingURL=negotiation.insights.generator.js.map