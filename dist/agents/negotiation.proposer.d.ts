import { type NegotiationTurn, type UserNegotiationContext, type SeedAssessment } from "../states/negotiation.state.js";
export interface NegotiationProposerInput {
    ownUser: UserNegotiationContext;
    otherUser: UserNegotiationContext;
    indexContext: {
        indexId: string;
        prompt: string;
    };
    seedAssessment: SeedAssessment;
    history: NegotiationTurn[];
}
/**
 * Negotiation agent that argues for the match.
 * @remarks Uses structured output to produce a NegotiationTurn.
 */
export declare class NegotiationProposer {
    private model;
    constructor();
    /**
     * Generate a proposal or counter-proposal turn.
     * @param input - User contexts, seed assessment, and negotiation history
     * @returns A structured NegotiationTurn
     */
    invoke(input: NegotiationProposerInput): Promise<NegotiationTurn>;
}
//# sourceMappingURL=negotiation.proposer.d.ts.map