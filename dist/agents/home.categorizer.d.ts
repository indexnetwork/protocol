/**
 * Home Categorizer Agent
 *
 * Takes a list of presenter-produced opportunity cards and returns dynamic sections
 * with CTA-style titles and Lucide icon names. Used by the home graph after
 * generateCardText.
 */
import type { HomeSectionProposal } from '../states/home.state';
export type CategorizerInputItem = {
    index: number;
    headline?: string;
    mainText: string;
    name: string;
    viewerRole?: string;
    opportunityStatus?: string;
};
export type CategorizerResult = {
    sections: HomeSectionProposal[];
};
export declare class HomeCategorizerAgent {
    private model;
    constructor();
    /**
     * Categorize presenter-produced cards into 1–5 sections with CTA-style titles and icons.
     */
    categorize(cards: CategorizerInputItem[]): Promise<CategorizerResult>;
}
//# sourceMappingURL=home.categorizer.d.ts.map