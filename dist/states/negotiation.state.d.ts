import { z } from "zod";
/** Zod schema for a single negotiation turn (DataPart payload in A2A message). */
export declare const NegotiationTurnSchema: z.ZodObject<{
    action: z.ZodEnum<["propose", "accept", "reject", "counter"]>;
    assessment: z.ZodObject<{
        fitScore: z.ZodNumber;
        reasoning: z.ZodString;
        suggestedRoles: z.ZodObject<{
            ownUser: z.ZodEnum<["agent", "patient", "peer"]>;
            otherUser: z.ZodEnum<["agent", "patient", "peer"]>;
        }, "strip", z.ZodTypeAny, {
            ownUser: "agent" | "patient" | "peer";
            otherUser: "agent" | "patient" | "peer";
        }, {
            ownUser: "agent" | "patient" | "peer";
            otherUser: "agent" | "patient" | "peer";
        }>;
    }, "strip", z.ZodTypeAny, {
        reasoning: string;
        fitScore: number;
        suggestedRoles: {
            ownUser: "agent" | "patient" | "peer";
            otherUser: "agent" | "patient" | "peer";
        };
    }, {
        reasoning: string;
        fitScore: number;
        suggestedRoles: {
            ownUser: "agent" | "patient" | "peer";
            otherUser: "agent" | "patient" | "peer";
        };
    }>;
}, "strip", z.ZodTypeAny, {
    action: "propose" | "accept" | "reject" | "counter";
    assessment: {
        reasoning: string;
        fitScore: number;
        suggestedRoles: {
            ownUser: "agent" | "patient" | "peer";
            otherUser: "agent" | "patient" | "peer";
        };
    };
}, {
    action: "propose" | "accept" | "reject" | "counter";
    assessment: {
        reasoning: string;
        fitScore: number;
        suggestedRoles: {
            ownUser: "agent" | "patient" | "peer";
            otherUser: "agent" | "patient" | "peer";
        };
    };
}>;
export type NegotiationTurn = z.infer<typeof NegotiationTurnSchema>;
/** Zod schema for the negotiation outcome (Artifact payload on COMPLETED task). */
export declare const NegotiationOutcomeSchema: z.ZodObject<{
    hasOpportunity: z.ZodBoolean;
    finalScore: z.ZodNumber;
    agreedRoles: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        role: z.ZodEnum<["agent", "patient", "peer"]>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        role: "agent" | "patient" | "peer";
    }, {
        userId: string;
        role: "agent" | "patient" | "peer";
    }>, "many">;
    reasoning: z.ZodString;
    turnCount: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    hasOpportunity: boolean;
    finalScore: number;
    agreedRoles: {
        userId: string;
        role: "agent" | "patient" | "peer";
    }[];
    turnCount: number;
    reason?: string | undefined;
}, {
    reasoning: string;
    hasOpportunity: boolean;
    finalScore: number;
    agreedRoles: {
        userId: string;
        role: "agent" | "patient" | "peer";
    }[];
    turnCount: number;
    reason?: string | undefined;
}>;
export type NegotiationOutcome = z.infer<typeof NegotiationOutcomeSchema>;
/** Context each agent receives about its user. */
export interface UserNegotiationContext {
    id: string;
    intents: Array<{
        id: string;
        title: string;
        description: string;
        confidence: number;
    }>;
    profile: {
        name?: string;
        bio?: string;
        location?: string;
        interests?: string[];
        skills?: string[];
    };
}
/** Seed assessment from the evaluator pre-filter. */
export interface SeedAssessment {
    score: number;
    reasoning: string;
    valencyRole: string;
    actors?: Array<{
        userId: string;
        role: string;
    }>;
}
/** Typed interface for a negotiation graph's invoke signature. */
export interface NegotiationGraphLike {
    invoke(input: {
        sourceUser: UserNegotiationContext;
        candidateUser: UserNegotiationContext;
        indexContext: {
            indexId: string;
            prompt: string;
        };
        seedAssessment: Omit<SeedAssessment, "actors">;
        maxTurns?: number;
    }): Promise<{
        outcome: NegotiationOutcome | null;
        messages?: NegotiationMessage[];
    }>;
}
/** A2A message record shape (matches messages table). */
export interface NegotiationMessage {
    id: string;
    senderId: string;
    role: "agent";
    parts: unknown[];
    createdAt: Date;
}
/** LangGraph state annotation for the negotiation graph. */
export declare const NegotiationGraphState: import("@langchain/langgraph").AnnotationRoot<{
    sourceUser: import("@langchain/langgraph").BaseChannel<UserNegotiationContext, UserNegotiationContext | import("@langchain/langgraph").OverwriteValue<UserNegotiationContext>, unknown>;
    candidateUser: import("@langchain/langgraph").BaseChannel<UserNegotiationContext, UserNegotiationContext | import("@langchain/langgraph").OverwriteValue<UserNegotiationContext>, unknown>;
    indexContext: import("@langchain/langgraph").BaseChannel<{
        indexId: string;
        prompt: string;
    }, {
        indexId: string;
        prompt: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        indexId: string;
        prompt: string;
    }>, unknown>;
    seedAssessment: import("@langchain/langgraph").BaseChannel<SeedAssessment, SeedAssessment | import("@langchain/langgraph").OverwriteValue<SeedAssessment>, unknown>;
    conversationId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    taskId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    messages: import("@langchain/langgraph").BaseChannel<NegotiationMessage[], NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<NegotiationMessage[]>, unknown>;
    turnCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    maxTurns: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    currentSpeaker: import("@langchain/langgraph").BaseChannel<"source" | "candidate", "source" | "candidate" | import("@langchain/langgraph").OverwriteValue<"source" | "candidate">, unknown>;
    lastTurn: import("@langchain/langgraph").BaseChannel<{
        action: "propose" | "accept" | "reject" | "counter";
        assessment: {
            reasoning: string;
            fitScore: number;
            suggestedRoles: {
                ownUser: "agent" | "patient" | "peer";
                otherUser: "agent" | "patient" | "peer";
            };
        };
    } | null, {
        action: "propose" | "accept" | "reject" | "counter";
        assessment: {
            reasoning: string;
            fitScore: number;
            suggestedRoles: {
                ownUser: "agent" | "patient" | "peer";
                otherUser: "agent" | "patient" | "peer";
            };
        };
    } | import("@langchain/langgraph").OverwriteValue<{
        action: "propose" | "accept" | "reject" | "counter";
        assessment: {
            reasoning: string;
            fitScore: number;
            suggestedRoles: {
                ownUser: "agent" | "patient" | "peer";
                otherUser: "agent" | "patient" | "peer";
            };
        };
    } | null> | null, unknown>;
    outcome: import("@langchain/langgraph").BaseChannel<{
        reasoning: string;
        hasOpportunity: boolean;
        finalScore: number;
        agreedRoles: {
            userId: string;
            role: "agent" | "patient" | "peer";
        }[];
        turnCount: number;
        reason?: string | undefined;
    } | null, {
        reasoning: string;
        hasOpportunity: boolean;
        finalScore: number;
        agreedRoles: {
            userId: string;
            role: "agent" | "patient" | "peer";
        }[];
        turnCount: number;
        reason?: string | undefined;
    } | import("@langchain/langgraph").OverwriteValue<{
        reasoning: string;
        hasOpportunity: boolean;
        finalScore: number;
        agreedRoles: {
            userId: string;
            role: "agent" | "patient" | "peer";
        }[];
        turnCount: number;
        reason?: string | undefined;
    } | null> | null, unknown>;
    error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
}>;
//# sourceMappingURL=negotiation.state.d.ts.map