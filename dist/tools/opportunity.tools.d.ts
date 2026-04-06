import type { DefineTool, ToolDeps } from "./tool.helpers";
import type { Opportunity } from "../interfaces/database.interface";
/**
 * Build minimal opportunity card data for chat without calling the LLM presenter.
 * Uses only required fields from the opportunity record and counterpart name/avatar
 * so list_opportunities and discovery return quickly.
 *
 * Note: narratorChip.text is generated via regex heuristics (narratorRemarkFromReasoning)
 * rather than the OpportunityPresenter LLM. If narrator quality becomes an issue again,
 * consider making this function async and delegating to OpportunityPresenter.presentHomeCard()
 * which already produces a high-quality narratorRemark via LLM (used by the home graph
 * and discovery pipeline). The trade-off is 5-20s latency per card.
 *
 * Exported for use in tests (opportunity.tools.spec.ts).
 */
export declare function buildMinimalOpportunityCard(opp: Opportunity, viewerId: string, counterpartUserId: string, counterpartName: string, counterpartAvatar: string | null, introducerName?: string | null, introducerAvatar?: string | null, viewerName?: string, secondPartyName?: string, secondPartyAvatar?: string | null, secondPartyUserId?: string, isCounterpartGhost?: boolean): {
    opportunityId: string;
    userId: string;
    name: string;
    avatar: string | null;
    mainText: string;
    cta: string;
    headline: string;
    primaryActionLabel: string;
    secondaryActionLabel: string;
    mutualIntentsLabel: string;
    narratorChip: {
        name: string;
        text: string;
        avatar?: string | null;
        userId?: string;
    };
    viewerRole: string;
    score: number | undefined;
    status: string;
    isGhost: boolean;
    secondParty?: {
        name: string;
        avatar?: string | null;
        userId?: string;
    };
};
export declare function createOpportunityTools(defineTool: DefineTool, deps: ToolDeps): readonly [any, any, any];
//# sourceMappingURL=opportunity.tools.d.ts.map