import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
/** Zod schema for a single negotiation turn (DataPart payload in A2A message). */
export const NegotiationTurnSchema = z.object({
    action: z.enum(["propose", "accept", "reject", "counter"]),
    assessment: z.object({
        fitScore: z.number().min(0).max(100),
        reasoning: z.string(),
        suggestedRoles: z.object({
            ownUser: z.enum(["agent", "patient", "peer"]),
            otherUser: z.enum(["agent", "patient", "peer"]),
        }),
    }),
});
/** Zod schema for the negotiation outcome (Artifact payload on COMPLETED task). */
export const NegotiationOutcomeSchema = z.object({
    hasOpportunity: z.boolean(),
    finalScore: z.number().min(0).max(100),
    agreedRoles: z.array(z.object({
        userId: z.string(),
        role: z.enum(["agent", "patient", "peer"]),
    })),
    reasoning: z.string(),
    turnCount: z.number(),
    reason: z.string().optional(),
});
/** LangGraph state annotation for the negotiation graph. */
export const NegotiationGraphState = Annotation.Root({
    sourceUser: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({ id: "", intents: [], profile: {} }),
    }),
    candidateUser: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({ id: "", intents: [], profile: {} }),
    }),
    indexContext: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({ indexId: "", prompt: "" }),
    }),
    seedAssessment: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => ({ score: 0, reasoning: "", valencyRole: "" }),
    }),
    conversationId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => "",
    }),
    taskId: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => "",
    }),
    messages: Annotation({
        reducer: (curr, next) => [...curr, ...(next || [])],
        default: () => [],
    }),
    turnCount: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 0,
    }),
    maxTurns: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => 6,
    }),
    currentSpeaker: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => "source",
    }),
    lastTurn: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => null,
    }),
    outcome: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => null,
    }),
    error: Annotation({
        reducer: (curr, next) => next ?? curr,
        default: () => null,
    }),
});
//# sourceMappingURL=negotiation.state.js.map