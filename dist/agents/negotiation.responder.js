import { createModel } from "./model.config";
import { NegotiationTurnSchema } from "../states/negotiation.state";
const SYSTEM_PROMPT = `You are a negotiation agent representing your user in an opportunity matching system.
Your role is to EVALUATE proposals and PROTECT your user from poor matches.

You will receive:
- Your user's profile, intents, and context
- The other user's profile, intents, and context
- The proposal or counter-proposal from the other agent
- Full negotiation history

Your job:
1. Critically evaluate whether this match genuinely serves YOUR user's intents.
2. Respond with one of:
   - "accept" — the match is genuinely valuable for your user. Both sides benefit.
   - "reject" — the match does not serve your user's needs. Explain clearly why.
   - "counter" — partially convinced but have specific objections. State what's missing or weak.

Rules:
- Be skeptical. Your job is to protect your user from noise.
- Don't accept just because the other agent is enthusiastic.
- Look for concrete intent alignment, not vague overlap.
- If the other agent addressed your previous objections well, acknowledge it.
- If their counter didn't address your concerns, reject.
- Your fitScore should reflect YOUR independent assessment.
- suggestedRoles: "agent" = can help, "patient" = seeks help, "peer" = mutual benefit.`;
/**
 * Negotiation agent that evaluates proposals against its user's interests.
 * @remarks Uses structured output to produce a NegotiationTurn.
 */
export class NegotiationResponder {
    constructor() {
        this.model = createModel("negotiationResponder").withStructuredOutput(NegotiationTurnSchema, { name: "negotiation_responder" });
    }
    /**
     * Evaluate a proposal/counter and respond.
     * @param input - User contexts, seed assessment, and negotiation history
     * @returns A structured NegotiationTurn (accept/reject/counter)
     */
    async invoke(input) {
        const historyText = input.history
            .map((t, i) => `Turn ${i + 1}: ${t.action} — fitScore: ${t.assessment.fitScore}, reasoning: ${t.assessment.reasoning}`)
            .join("\n");
        const userMessage = `YOUR USER:
Name: ${input.ownUser.profile.name ?? "Unknown"}
Bio: ${input.ownUser.profile.bio ?? "N/A"}
Skills: ${input.ownUser.profile.skills?.join(", ") ?? "N/A"}
Intents: ${input.ownUser.intents.map((i) => `- ${i.title}: ${i.description} (confidence: ${i.confidence})`).join("\n")}

OTHER USER (proposing the match):
Name: ${input.otherUser.profile.name ?? "Unknown"}
Bio: ${input.otherUser.profile.bio ?? "N/A"}
Skills: ${input.otherUser.profile.skills?.join(", ") ?? "N/A"}
Intents: ${input.otherUser.intents.map((i) => `- ${i.title}: ${i.description} (confidence: ${i.confidence})`).join("\n")}

INDEX CONTEXT: ${input.indexContext.prompt || "General discovery"}

EVALUATOR PRE-SCREEN: Score ${input.seedAssessment.score}/100 — ${input.seedAssessment.reasoning}

NEGOTIATION HISTORY:
${historyText}

Evaluate the latest proposal/counter from the other agent. Does this match genuinely serve your user?`;
        const result = await this.model.invoke([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
        ]);
        return result;
    }
}
//# sourceMappingURL=negotiation.responder.js.map