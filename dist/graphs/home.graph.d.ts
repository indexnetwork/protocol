/**
 * Home Graph: Build the opportunity home view with dynamic sections.
 *
 * Independent of ChatGraph. Flow:
 * loadOpportunities → checkPresenterCache → [generateCardText if misses] → cachePresenterResults
 * → checkCategorizerCache → [categorizeDynamically if miss] → cacheCategorizerResults → normalizeAndSort
 *
 * Uses OpportunityPresenter for card text and an LLM to categorize cards into dynamic sections
 * with titles and Lucide icon names. Caches presenter and categorizer results via OpportunityCache.
 */
import type { HomeGraphDatabase } from '../interfaces/database.interface.js';
import type { OpportunityCache } from '../interfaces/cache.interface.js';
import { type HomeCardItem, type HomeSection, type HomeSectionProposal } from '../states/home.state.js';
import type { DebugMetaAgent } from '../types/chat-streaming.types.js';
/** Database must satisfy both HomeGraphDatabase and presenter context (getProfile, getActiveIntents, getIndex, getUser). */
type HomeGraphDb = HomeGraphDatabase;
export type HomeGraphInvokeInput = {
    userId: string;
    networkId?: string;
    limit?: number;
    noCache?: boolean;
};
export type HomeGraphInvokeResult = {
    sections: HomeSection[];
    meta: {
        totalOpportunities: number;
        totalSections: number;
    };
    error?: string;
};
/**
 * Strip leading narrator name from remark when the UI already prepends "Name: " to the chip.
 * Avoids duplication like "Yankı Ekin Yüksel: Yankı Ekin Yüksel introduced you two..."
 * Repeats until no leading name (handles "Name: Name rest").
 */
export declare function stripLeadingNarratorName(remark: string, narratorName: string): string;
export declare class HomeGraphFactory {
    private database;
    private cache;
    constructor(database: HomeGraphDb, cache: OpportunityCache);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        networkId: string | undefined;
        limit: number;
        noCache: boolean;
        opportunities: import("../interfaces/database.interface.js").Opportunity[];
        cards: HomeCardItem[];
        sectionProposals: HomeSectionProposal[];
        sections: HomeSection[];
        cachedCards: Map<string, HomeCardItem>;
        uncachedOpportunities: import("../interfaces/database.interface.js").Opportunity[];
        categoryCacheHit: boolean;
        error: string | undefined;
        meta: {
            totalOpportunities: number;
            totalSections: number;
        };
        agentTimings: DebugMetaAgent[];
    }, {
        userId?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
        networkId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        limit?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        noCache?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        opportunities?: import("../interfaces/database.interface.js").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Opportunity[]> | undefined;
        cards?: HomeCardItem[] | import("@langchain/langgraph").OverwriteValue<HomeCardItem[]> | undefined;
        sectionProposals?: HomeSectionProposal[] | import("@langchain/langgraph").OverwriteValue<HomeSectionProposal[]> | undefined;
        sections?: HomeSection[] | import("@langchain/langgraph").OverwriteValue<HomeSection[]> | undefined;
        cachedCards?: Map<string, HomeCardItem> | import("@langchain/langgraph").OverwriteValue<Map<string, HomeCardItem>> | undefined;
        uncachedOpportunities?: import("../interfaces/database.interface.js").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Opportunity[]> | undefined;
        categoryCacheHit?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        meta?: {
            totalOpportunities: number;
            totalSections: number;
        } | import("@langchain/langgraph").OverwriteValue<{
            totalOpportunities: number;
            totalSections: number;
        }> | undefined;
        agentTimings?: DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]> | undefined;
    }, "__start__" | "loadOpportunities" | "checkPresenterCache" | "generateCardText" | "cachePresenterResults" | "checkCategorizerCache" | "categorizeDynamically" | "cacheCategorizerResults" | "normalizeAndSort", {
        userId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        limit: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        noCache: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        opportunities: import("@langchain/langgraph").BaseChannel<import("../interfaces/database.interface.js").Opportunity[], import("../interfaces/database.interface.js").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Opportunity[]>, unknown>;
        cards: import("@langchain/langgraph").BaseChannel<HomeCardItem[], HomeCardItem[] | import("@langchain/langgraph").OverwriteValue<HomeCardItem[]>, unknown>;
        sectionProposals: import("@langchain/langgraph").BaseChannel<HomeSectionProposal[], HomeSectionProposal[] | import("@langchain/langgraph").OverwriteValue<HomeSectionProposal[]>, unknown>;
        sections: import("@langchain/langgraph").BaseChannel<HomeSection[], HomeSection[] | import("@langchain/langgraph").OverwriteValue<HomeSection[]>, unknown>;
        cachedCards: import("@langchain/langgraph").BaseChannel<Map<string, HomeCardItem>, Map<string, HomeCardItem> | import("@langchain/langgraph").OverwriteValue<Map<string, HomeCardItem>>, unknown>;
        uncachedOpportunities: import("@langchain/langgraph").BaseChannel<import("../interfaces/database.interface.js").Opportunity[], import("../interfaces/database.interface.js").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Opportunity[]>, unknown>;
        categoryCacheHit: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        meta: import("@langchain/langgraph").BaseChannel<{
            totalOpportunities: number;
            totalSections: number;
        }, {
            totalOpportunities: number;
            totalSections: number;
        } | import("@langchain/langgraph").OverwriteValue<{
            totalOpportunities: number;
            totalSections: number;
        }>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, {
        userId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        networkId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        limit: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        noCache: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        opportunities: import("@langchain/langgraph").BaseChannel<import("../interfaces/database.interface.js").Opportunity[], import("../interfaces/database.interface.js").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Opportunity[]>, unknown>;
        cards: import("@langchain/langgraph").BaseChannel<HomeCardItem[], HomeCardItem[] | import("@langchain/langgraph").OverwriteValue<HomeCardItem[]>, unknown>;
        sectionProposals: import("@langchain/langgraph").BaseChannel<HomeSectionProposal[], HomeSectionProposal[] | import("@langchain/langgraph").OverwriteValue<HomeSectionProposal[]>, unknown>;
        sections: import("@langchain/langgraph").BaseChannel<HomeSection[], HomeSection[] | import("@langchain/langgraph").OverwriteValue<HomeSection[]>, unknown>;
        cachedCards: import("@langchain/langgraph").BaseChannel<Map<string, HomeCardItem>, Map<string, HomeCardItem> | import("@langchain/langgraph").OverwriteValue<Map<string, HomeCardItem>>, unknown>;
        uncachedOpportunities: import("@langchain/langgraph").BaseChannel<import("../interfaces/database.interface.js").Opportunity[], import("../interfaces/database.interface.js").Opportunity[] | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Opportunity[]>, unknown>;
        categoryCacheHit: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        meta: import("@langchain/langgraph").BaseChannel<{
            totalOpportunities: number;
            totalSections: number;
        }, {
            totalOpportunities: number;
            totalSections: number;
        } | import("@langchain/langgraph").OverwriteValue<{
            totalOpportunities: number;
            totalSections: number;
        }>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        loadOpportunities: {
            error: string;
            opportunities?: undefined;
        } | {
            opportunities: import("../interfaces/database.interface.js").Opportunity[];
            error?: undefined;
        } | {
            error: string;
            opportunities: never[];
        };
        checkPresenterCache: {
            cachedCards: Map<any, any>;
            uncachedOpportunities: import("../interfaces/database.interface.js").Opportunity[];
        };
        generateCardText: {
            cards: HomeCardItem[];
            agentTimings: DebugMetaAgent[];
            meta: {
                totalOpportunities: number;
                totalSections: number;
            };
        };
        cachePresenterResults: {
            cards: HomeCardItem[];
            meta: {
                totalOpportunities: number;
                totalSections: number;
            };
        };
        checkCategorizerCache: {
            categoryCacheHit: boolean;
            sectionProposals?: undefined;
        } | {
            sectionProposals: HomeSectionProposal[];
            categoryCacheHit: boolean;
        };
        categorizeDynamically: {
            sectionProposals: HomeSectionProposal[];
            agentTimings: DebugMetaAgent[];
        };
        cacheCategorizerResults: {};
        normalizeAndSort: {
            sections: HomeSection[];
            meta: {
                totalOpportunities: number;
                totalSections: number;
            };
        };
    }, unknown, unknown>;
}
export {};
//# sourceMappingURL=home.graph.d.ts.map