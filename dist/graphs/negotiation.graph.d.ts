import { type TraceEmitter } from "../support/request-context";
import type { NegotiationDatabase } from "../interfaces/database.interface";
import { type NegotiationTurn, type NegotiationOutcome, type UserNegotiationContext, type SeedAssessment, type NegotiationGraphLike } from "../states/negotiation.state";
interface NegotiationAgentLike {
    invoke(input: {
        ownUser: UserNegotiationContext;
        otherUser: UserNegotiationContext;
        indexContext: {
            indexId: string;
            prompt: string;
        };
        seedAssessment: SeedAssessment;
        history: NegotiationTurn[];
    }): Promise<NegotiationTurn>;
}
/**
 * Factory for the bilateral negotiation LangGraph state machine.
 * @remarks Accepts dependencies via constructor for testability.
 */
export declare class NegotiationGraphFactory {
    private database;
    private proposer;
    private responder;
    constructor(database: NegotiationDatabase, proposer: NegotiationAgentLike, responder: NegotiationAgentLike);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        sourceUser: UserNegotiationContext;
        candidateUser: UserNegotiationContext;
        indexContext: {
            indexId: string;
            prompt: string;
        };
        seedAssessment: SeedAssessment;
        conversationId: string;
        taskId: string;
        messages: import("../states/negotiation.state").NegotiationMessage[];
        turnCount: number;
        maxTurns: number;
        currentSpeaker: "source" | "candidate";
        lastTurn: {
            action: "propose" | "accept" | "reject" | "counter";
            assessment: {
                reasoning: string;
                fitScore: number;
                suggestedRoles: {
                    ownUser: "agent" | "patient" | "peer";
                    otherUser: "agent" | "patient" | "peer";
                };
            };
        } | null;
        outcome: {
            reasoning: string;
            hasOpportunity: boolean;
            finalScore: number;
            agreedRoles: {
                userId: string;
                role: "agent" | "patient" | "peer";
            }[];
            turnCount: number;
            reason?: string | undefined;
        } | null;
        error: string | null;
    }, {
        sourceUser?: UserNegotiationContext | import("@langchain/langgraph").OverwriteValue<UserNegotiationContext> | undefined;
        candidateUser?: UserNegotiationContext | import("@langchain/langgraph").OverwriteValue<UserNegotiationContext> | undefined;
        indexContext?: {
            indexId: string;
            prompt: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            indexId: string;
            prompt: string;
        }> | undefined;
        seedAssessment?: SeedAssessment | import("@langchain/langgraph").OverwriteValue<SeedAssessment> | undefined;
        conversationId?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
        taskId?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
        messages?: import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]> | undefined;
        turnCount?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        maxTurns?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        currentSpeaker?: "source" | "candidate" | import("@langchain/langgraph").OverwriteValue<"source" | "candidate"> | undefined;
        lastTurn?: {
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
        } | null> | null | undefined;
        outcome?: {
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
        } | null> | null | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | null> | null | undefined;
    }, "__start__" | "init" | "turn" | "finalize", {
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
        messages: import("@langchain/langgraph").BaseChannel<import("../states/negotiation.state").NegotiationMessage[], import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]>, unknown>;
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
    }, {
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
        messages: import("@langchain/langgraph").BaseChannel<import("../states/negotiation.state").NegotiationMessage[], import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]>, unknown>;
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
    }, import("@langchain/langgraph").StateDefinition, {
        init: {
            conversationId: string;
            taskId: string;
            currentSpeaker: "source";
            turnCount: number;
            error?: undefined;
        } | {
            error: string;
            conversationId?: undefined;
            taskId?: undefined;
            currentSpeaker?: undefined;
            turnCount?: undefined;
        };
        turn: import("@langchain/langgraph").UpdateType<{
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
            messages: import("@langchain/langgraph").BaseChannel<import("../states/negotiation.state").NegotiationMessage[], import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]>, unknown>;
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
        finalize: {
            outcome: {
                reasoning: string;
                hasOpportunity: boolean;
                finalScore: number;
                agreedRoles: {
                    userId: string;
                    role: "agent" | "patient" | "peer";
                }[];
                turnCount: number;
                reason?: string | undefined;
            };
        };
    }, unknown, unknown>;
}
export interface NegotiationCandidate {
    userId: string;
    score: number;
    reasoning: string;
    valencyRole: string;
    indexId?: string;
    candidateUser: UserNegotiationContext;
}
export interface NegotiationResult {
    userId: string;
    negotiationScore: number;
    agreedRoles: NegotiationOutcome["agreedRoles"];
    reasoning: string;
    turnCount: number;
}
/**
 * Runs bilateral negotiation for each candidate in parallel.
 * @param negotiationGraph - Compiled negotiation graph
 * @param sourceUser - Source user context
 * @param candidates - Evaluated candidates to negotiate with
 * @param indexContext - Index context for the negotiation
 * @param opts - Optional maxTurns and traceEmitter
 * @returns Only candidates that produced an opportunity
 */
export declare function negotiateCandidates(negotiationGraph: NegotiationGraphLike, sourceUser: UserNegotiationContext, candidates: NegotiationCandidate[], indexContext: {
    indexId: string;
    prompt: string;
}, opts?: {
    maxTurns?: number;
    traceEmitter?: TraceEmitter;
    indexContextOverrides?: Map<string, string>;
}): Promise<NegotiationResult[]>;
/**
 * Creates a negotiation graph with the provided dependencies.
 * @param deps.database - Conversation database adapter
 * @param deps.proposer - Agent that proposes negotiation terms
 * @param deps.responder - Agent that responds to negotiation proposals
 */
export declare function createDefaultNegotiationGraph(deps: {
    database: NegotiationDatabase;
    proposer: NegotiationAgentLike;
    responder: NegotiationAgentLike;
}): import("@langchain/langgraph").CompiledStateGraph<{
    sourceUser: UserNegotiationContext;
    candidateUser: UserNegotiationContext;
    indexContext: {
        indexId: string;
        prompt: string;
    };
    seedAssessment: SeedAssessment;
    conversationId: string;
    taskId: string;
    messages: import("../states/negotiation.state").NegotiationMessage[];
    turnCount: number;
    maxTurns: number;
    currentSpeaker: "source" | "candidate";
    lastTurn: {
        action: "propose" | "accept" | "reject" | "counter";
        assessment: {
            reasoning: string;
            fitScore: number;
            suggestedRoles: {
                ownUser: "agent" | "patient" | "peer";
                otherUser: "agent" | "patient" | "peer";
            };
        };
    } | null;
    outcome: {
        reasoning: string;
        hasOpportunity: boolean;
        finalScore: number;
        agreedRoles: {
            userId: string;
            role: "agent" | "patient" | "peer";
        }[];
        turnCount: number;
        reason?: string | undefined;
    } | null;
    error: string | null;
}, {
    sourceUser?: UserNegotiationContext | import("@langchain/langgraph").OverwriteValue<UserNegotiationContext> | undefined;
    candidateUser?: UserNegotiationContext | import("@langchain/langgraph").OverwriteValue<UserNegotiationContext> | undefined;
    indexContext?: {
        indexId: string;
        prompt: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        indexId: string;
        prompt: string;
    }> | undefined;
    seedAssessment?: SeedAssessment | import("@langchain/langgraph").OverwriteValue<SeedAssessment> | undefined;
    conversationId?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
    taskId?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
    messages?: import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]> | undefined;
    turnCount?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
    maxTurns?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
    currentSpeaker?: "source" | "candidate" | import("@langchain/langgraph").OverwriteValue<"source" | "candidate"> | undefined;
    lastTurn?: {
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
    } | null> | null | undefined;
    outcome?: {
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
    } | null> | null | undefined;
    error?: string | import("@langchain/langgraph").OverwriteValue<string | null> | null | undefined;
}, "__start__" | "init" | "turn" | "finalize", {
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
    messages: import("@langchain/langgraph").BaseChannel<import("../states/negotiation.state").NegotiationMessage[], import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]>, unknown>;
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
}, {
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
    messages: import("@langchain/langgraph").BaseChannel<import("../states/negotiation.state").NegotiationMessage[], import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]>, unknown>;
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
}, import("@langchain/langgraph").StateDefinition, {
    init: {
        conversationId: string;
        taskId: string;
        currentSpeaker: "source";
        turnCount: number;
        error?: undefined;
    } | {
        error: string;
        conversationId?: undefined;
        taskId?: undefined;
        currentSpeaker?: undefined;
        turnCount?: undefined;
    };
    turn: import("@langchain/langgraph").UpdateType<{
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
        messages: import("@langchain/langgraph").BaseChannel<import("../states/negotiation.state").NegotiationMessage[], import("../states/negotiation.state").NegotiationMessage[] | import("@langchain/langgraph").OverwriteValue<import("../states/negotiation.state").NegotiationMessage[]>, unknown>;
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
    finalize: {
        outcome: {
            reasoning: string;
            hasOpportunity: boolean;
            finalScore: number;
            agreedRoles: {
                userId: string;
                role: "agent" | "patient" | "peer";
            }[];
            turnCount: number;
            reason?: string | undefined;
        };
    };
}, unknown, unknown>;
export {};
//# sourceMappingURL=negotiation.graph.d.ts.map