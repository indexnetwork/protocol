/**
 * Opportunity Presenter Agent
 *
 * Generates personalized, second-person explanations of why an opportunity
 * matters to the viewing user. Uses full opportunity data (interpretation,
 * actors, profiles, intents, index) to produce headline, personalizedSummary,
 * and suggestedAction for chat tools and user-facing surfaces.
 */
import { z } from "zod";
import type { Opportunity } from "../interfaces/database.interface.js";
import type { ChatGraphCompositeDatabase } from "../interfaces/database.interface.js";
/**
 * Minimal database interface required by gatherPresenterContext.
 * Any database adapter that implements these three methods can be passed.
 */
export type PresenterDatabase = Pick<ChatGraphCompositeDatabase, "getProfile" | "getActiveIntents" | "getIndex">;
declare const PresentationSchema: z.ZodObject<{
    headline: z.ZodString;
    personalizedSummary: z.ZodString;
    suggestedAction: z.ZodString;
}, "strip", z.ZodTypeAny, {
    headline: string;
    personalizedSummary: string;
    suggestedAction: string;
}, {
    headline: string;
    personalizedSummary: string;
    suggestedAction: string;
}>;
export type OpportunityPresentationResult = z.infer<typeof PresentationSchema>;
/** Input for home-card presenter call; extends PresenterInput with optional mutual intent count. */
export interface HomeCardPresenterInput extends PresenterInput {
    /** Number of overlapping intents (for generating mutualIntentsLabel). */
    mutualIntentCount?: number;
}
/** LLM-generated fields for home-card presentation (buttons are hardcoded by callers, not LLM-generated). */
export declare const HomeCardLLMSchema: z.ZodObject<{
    headline: z.ZodString;
    personalizedSummary: z.ZodString;
    suggestedAction: z.ZodString;
    narratorRemark: z.ZodString;
    mutualIntentsLabel: z.ZodString;
}, "strip", z.ZodTypeAny, {
    headline: string;
    personalizedSummary: string;
    suggestedAction: string;
    narratorRemark: string;
    mutualIntentsLabel: string;
}, {
    headline: string;
    personalizedSummary: string;
    suggestedAction: string;
    narratorRemark: string;
    mutualIntentsLabel: string;
}>;
/** LLM-generated result from presentHomeCard (callers append button labels from opportunity.constants). */
export type HomeCardLLMResult = z.infer<typeof HomeCardLLMSchema>;
/** Full home-card display contract including hardcoded button labels (assembled by callers). */
export type HomeCardPresentationResult = HomeCardLLMResult & {
    primaryActionLabel: string;
    secondaryActionLabel: string;
};
/** Input for a single presenter call (all context pre-assembled). */
export interface PresenterInput {
    viewerContext: string;
    otherPartyContext: string;
    matchReasoning: string;
    category: string;
    confidence: number;
    signalsSummary: string;
    indexName: string;
    viewerRole: string;
    opportunityStatus?: string;
    /** True when this opportunity was created via an explicit introduction (not automatic discovery). */
    isIntroduction?: boolean;
    /** Name of the person who made the introduction, if applicable. */
    introducerName?: string;
}
export declare class OpportunityPresenter {
    private model;
    private homeCardModel;
    constructor();
    private invokeWithTimeout;
    /**
     * Generate personalized presentation for a single opportunity.
     */
    present(input: PresenterInput): Promise<OpportunityPresentationResult>;
    /**
     * Generate LLM-powered home-card content (headline, body, narrator remark, mutual-intent label).
     * Callers append button labels from opportunity.constants.
     */
    presentHomeCard(input: HomeCardPresenterInput): Promise<HomeCardLLMResult>;
    /**
     * Process multiple opportunities in parallel with bounded concurrency.
     */
    presentBatch(inputs: PresenterInput[], options?: {
        concurrency?: number;
    }): Promise<OpportunityPresentationResult[]>;
    /**
     * Process multiple opportunities as home cards in parallel with bounded concurrency.
     * Returns full home-card display contracts (headline, body, narrator remark, action labels, mutual-intent label).
     */
    presentHomeCardBatch(inputs: HomeCardPresenterInput[], options?: {
        concurrency?: number;
    }): Promise<HomeCardLLMResult[]>;
}
/**
 * Gather all context needed for the presenter from the database.
 * Fetches viewer profile, viewer intents, other party profile(s), and index in parallel.
 *
 * @param displayCounterpartUserId - When set (e.g. for home card), only this counterpart is included in otherPartyContext so the presenter writes about the person on the card. Omitted for introducer view (card shows both parties).
 */
export declare function gatherPresenterContext(database: PresenterDatabase, opportunity: Opportunity, viewerId: string, displayCounterpartUserId?: string): Promise<PresenterInput>;
export {};
//# sourceMappingURL=opportunity.presenter.d.ts.map