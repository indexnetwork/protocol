import type { Opportunity } from '../interfaces/database.interface.js';
import type { DebugMetaAgent } from '../types/chat-streaming.types.js';
/**
 * Home view card item: one opportunity with full presenter-driven display contract.
 */
export interface HomeCardItem {
    opportunityId: string;
    userId: string;
    name: string;
    avatar: string | null;
    mainText: string;
    cta: string;
    headline?: string;
    /** Presenter-generated; primary button (accept) and secondary button (dismiss). */
    primaryActionLabel: string;
    secondaryActionLabel: string;
    /** Presenter-generated subtitle under the other party name (e.g. "1 mutual intent"). */
    mutualIntentsLabel: string;
    /** Narrator chip for human-introduced opportunities; avatar set when narrator is a user */
    narratorChip?: {
        name: string;
        text: string;
        avatar?: string | null;
        userId?: string;
    };
    /** Viewer's role in this opportunity (e.g. 'introducer', 'party', 'agent', 'patient', 'peer'). */
    viewerRole?: string;
    /** Whether the counterpart is a ghost (not yet onboarded) user. */
    isGhost?: boolean;
    /** Second party in introducer arrow layout. Present when viewerRole is 'introducer'. */
    secondParty?: {
        name: string;
        avatar?: string | null;
        userId?: string;
    };
    /** For section assignment from LLM */
    _cardIndex: number;
}
/**
 * Dynamic section from LLM categorization.
 */
export interface HomeSectionProposal {
    id: string;
    title: string;
    subtitle?: string;
    iconName: string;
    itemIndices: number[];
}
/** Card item as returned in API (no internal _cardIndex). */
export type HomeSectionItem = Omit<HomeCardItem, '_cardIndex'>;
/**
 * Final section for API response.
 */
export interface HomeSection {
    id: string;
    title: string;
    subtitle?: string;
    iconName: string;
    items: HomeSectionItem[];
}
/**
 * Home Graph State (Annotation-based).
 * Flow: loadOpportunities → generateCardText → categorizeDynamically → normalizeAndSort → finalizeResponse.
 */
export declare const HomeGraphState: import("@langchain/langgraph").AnnotationRoot<{
    userId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    limit: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    /** When true, bypass presenter and categorizer Redis caches. */
    noCache: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /** Raw opportunities visible to the viewer (after visibility filter). */
    opportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
    /** Cards with presenter output and narrator chip. */
    cards: import("@langchain/langgraph").BaseChannel<HomeCardItem[], HomeCardItem[] | import("@langchain/langgraph").OverwriteValue<HomeCardItem[]>, unknown>;
    /** LLM output: dynamic sections with icon and item indices. */
    sectionProposals: import("@langchain/langgraph").BaseChannel<HomeSectionProposal[], HomeSectionProposal[] | import("@langchain/langgraph").OverwriteValue<HomeSectionProposal[]>, unknown>;
    /** Final sections for response. */
    sections: import("@langchain/langgraph").BaseChannel<HomeSection[], HomeSection[] | import("@langchain/langgraph").OverwriteValue<HomeSection[]>, unknown>;
    /** Presenter results retrieved from cache (opportunityId → HomeCardItem). */
    cachedCards: import("@langchain/langgraph").BaseChannel<Map<string, HomeCardItem>, Map<string, HomeCardItem> | import("@langchain/langgraph").OverwriteValue<Map<string, HomeCardItem>>, unknown>;
    /** Opportunities that had no cache hit and need presenter generation. */
    uncachedOpportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
    /** Whether categorizer results were found in cache. */
    categoryCacheHit: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Meta for response (e.g. totalOpportunities, totalSections). */
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
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
}>;
//# sourceMappingURL=home.state.d.ts.map