import { createModel } from "../shared/agent/model.config.js";
import {
  SystemNegotiationTurnSchema,
  FinalNegotiationTurnSchema,
  type NegotiationTurn,
  type UserNegotiationContext,
  type SeedAssessment,
} from "./negotiation.state.js";

const SYSTEM_PROMPT = `You are the Index Negotiator, an AI agent acting on behalf of {userName}. You represent their interests in a bilateral negotiation about a potential connection on a discovery network.

{discoveryContext}

Your user's role in this connection: {role}
Network context: {networkContext}

Your job: Evaluate whether this connection genuinely serves {userName}'s interests given their role. Argue their case honestly — acknowledge weaknesses, but advocate for genuine fit.

Rules:
- On the FIRST turn: Propose the connection case. Explain why it would benefit both parties. Set action to "propose".
- On SUBSEQUENT turns: Evaluate the other agent's arguments. Either:
  - "counter" if you have specific objections but see potential
  - "accept" if the match genuinely benefits {userName}
  - "reject" if the match does not serve {userName}'s needs
- Focus on concrete intent alignment, not vague overlap.
- Do NOT reference internal system details like scores, pre-screens, or evaluator outputs.
- suggestedRoles: "agent" = can help, "patient" = seeks help, "peer" = mutual benefit.
{finalTurnInstruction}`;

export interface NegotiationAgentInput {
  ownUser: UserNegotiationContext;
  otherUser: UserNegotiationContext;
  indexContext: { networkId: string; prompt?: string };
  seedAssessment: SeedAssessment;
  history: NegotiationTurn[];
  isFinalTurn?: boolean;
  /** Whether ownUser is the party that initiated the discovery (searched/signalled). */
  isDiscoverer?: boolean;
}

/**
 * Unified system negotiation agent that advocates for its user.
 * Adapts behavior based on turn position (first turn = propose, subsequent = respond).
 * @remarks Uses structured output constrained to NegotiationTurnSchema (without question action).
 */
export class IndexNegotiator {
  /**
   * Generate a negotiation turn.
   * @param input - User contexts, seed assessment, history, and final turn flag
   * @returns A structured NegotiationTurn
   */
  async invoke(input: NegotiationAgentInput): Promise<NegotiationTurn> {
    const schema = input.isFinalTurn ? FinalNegotiationTurnSchema : SystemNegotiationTurnSchema;
    const model = createModel("negotiator").withStructuredOutput(schema, { name: "index_negotiator" });

    const userName = input.ownUser.profile.name ?? "your user";
    const role = input.seedAssessment.valencyRole || "peer";
    const networkContext = input.indexContext.prompt || "General discovery";
    const finalTurnInstruction = input.isFinalTurn
      ? "\n\nIMPORTANT: This is your FINAL turn. You MUST choose either 'accept' or 'reject'. No counter is allowed."
      : "";

    const otherName = input.otherUser.profile.name ?? "the other user";
    const discoveryContext = input.isDiscoverer
      ? `${userName} initiated this discovery — they are actively looking for connections. ${otherName} was identified as a potential match.`
      : `${otherName} initiated this discovery and found ${userName} as a potential match. You are representing the discovered party.`;

    const systemPrompt = SYSTEM_PROMPT
      .replace(/{userName}/g, userName)
      .replace("{discoveryContext}", discoveryContext)
      .replace("{role}", role)
      .replace("{networkContext}", networkContext)
      .replace("{finalTurnInstruction}", finalTurnInstruction);

    const historyText = input.history.length > 0
      ? `\n\nNegotiation history:\n${input.history.map((t, i) => {
          const msgPart = t.message ? ` — message: ${t.message}` : '';
          return `Turn ${i + 1}: ${t.action} — reasoning: ${t.assessment.reasoning}${msgPart}`;
        }).join("\n")}`
      : "";

    const userMessage = `YOUR USER (${userName}):
Bio: ${input.ownUser.profile.bio ?? "N/A"}
Skills: ${input.ownUser.profile.skills?.join(", ") ?? "N/A"}
Intents:
${input.ownUser.intents.map((i) => `- ${i.title}: ${i.description}`).join("\n")}

OTHER USER (${otherName}):
Bio: ${input.otherUser.profile.bio ?? "N/A"}
Skills: ${input.otherUser.profile.skills?.join(", ") ?? "N/A"}
Intents:
${input.otherUser.intents.map((i) => `- ${i.title}: ${i.description}`).join("\n")}

Why this match was suggested: ${input.seedAssessment.reasoning}${historyText}

${input.history.length === 0 ? "This is the opening turn. Propose the connection case." : "Evaluate the latest arguments and respond."}`;

    const result = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ]);

    return result as NegotiationTurn;
  }
}
