import { createModel } from "./model.config";
import { NegotiationTurnSchema } from "../states/negotiation.state";
const SYSTEM_PROMPT = `You are a negotiation agent representing your user in an opportunity matching system.
Your role is to PROPOSE and ARGUE FOR a potential match between your user and another user.

You will receive:
- Your user's profile, intents, and context
- The other user's profile, intents, and context
- An initial assessment from a pre-screening evaluator
- Any prior negotiation history

Your job:
1. On the FIRST turn: Propose the match. Explain why this connection would benefit both parties. Set action to "propose".
2. On SUBSEQUENT turns (after a counter from the other agent): Address their objections. Either:
   - "counter" with updated reasoning if you still believe in the match
   - "accept" if the other agent's counter is reasonable and you agree
   - "reject" if their objections reveal this is genuinely not a good match

Rules:
- Be honest. Do not hallucinate fit where there is none.
- Focus on concrete intent alignment, not vague similarities.
- If the evaluator pre-screen score was low, acknowledge weaknesses.
- Your fitScore should reflect YOUR honest assessment, not just echo the seed score.
- suggestedRoles: "agent" = can help, "patient" = seeks help, "peer" = mutual benefit.`;
/**
 * Negotiation agent that argues for the match.
 * @remarks Uses structured output to produce a NegotiationTurn.
 */
export class NegotiationProposer {
    constructor() {
        this.model = createModel("negotiationProposer").withStructuredOutput(NegotiationTurnSchema, { name: "negotiation_proposer" });
    }
    /**
     * Generate a proposal or counter-proposal turn.
     * @param input - User contexts, seed assessment, and negotiation history
     * @returns A structured NegotiationTurn
     */
    async invoke(input) {
        const historyText = input.history.length > 0
            ? `\n\nNegotiation history:\n${input.history.map((t, i) => `Turn ${i + 1}: ${t.action} — fitScore: ${t.assessment.fitScore}, reasoning: ${t.assessment.reasoning}`).join("\n")}`
            : "";
        const userMessage = `YOUR USER:
Name: ${input.ownUser.profile.name ?? "Unknown"}
Bio: ${input.ownUser.profile.bio ?? "N/A"}
Skills: ${input.ownUser.profile.skills?.join(", ") ?? "N/A"}
Intents: ${input.ownUser.intents.map((i) => `- ${i.title}: ${i.description} (confidence: ${i.confidence})`).join("\n")}

OTHER USER:
Name: ${input.otherUser.profile.name ?? "Unknown"}
Bio: ${input.otherUser.profile.bio ?? "N/A"}
Skills: ${input.otherUser.profile.skills?.join(", ") ?? "N/A"}
Intents: ${input.otherUser.intents.map((i) => `- ${i.title}: ${i.description} (confidence: ${i.confidence})`).join("\n")}

INDEX CONTEXT: ${input.indexContext.prompt || "General discovery"}

EVALUATOR PRE-SCREEN: Score ${input.seedAssessment.score}/100 — ${input.seedAssessment.reasoning}
Suggested role: ${input.seedAssessment.valencyRole}${historyText}

${input.history.length === 0 ? "This is the opening turn. Propose the match." : "The other agent countered. Respond to their objections."}`;
        const result = await this.model.invoke([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
        ]);
        return result;
    }
}
//# sourceMappingURL=negotiation.proposer.js.map