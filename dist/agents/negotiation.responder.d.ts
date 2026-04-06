import { type NegotiationTurn, type UserNegotiationContext, type SeedAssessment } from "../states/negotiation.state.js";
export interface NegotiationResponderInput {
    ownUser: UserNegotiationContext;
    otherUser: UserNegotiationContext;
    indexContext: {
        networkId: string;
        prompt: string;
    };
    seedAssessment: SeedAssessment;
    history: NegotiationTurn[];
}
/**
 * Negotiation agent that evaluates proposals against its user's interests.
 * @remarks Uses structured output to produce a NegotiationTurn.
 */
export declare class NegotiationResponder {
    private model;
    constructor();
    /**
     * Evaluate a proposal/counter and respond.
     * @param input - User contexts, seed assessment, and negotiation history
     * @returns A structured NegotiationTurn (accept/reject/counter)
     */
    invoke(input: NegotiationResponderInput): Promise<NegotiationTurn>;
}
//# sourceMappingURL=negotiation.responder.d.ts.map