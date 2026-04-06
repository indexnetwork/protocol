/**
 * Opportunity Graph: Linear Multi-Step Workflow for Opportunity Discovery
 *
 * Architecture: Follows intent graph pattern with Annotation-based state.
 * Flow: Prep → Scope → Discovery → Evaluation → Ranking → Persist → END
 *
 * Key Constraints:
 * - Opportunities only between intents sharing the same index
 * - Both intents must have hyde documents for semantic matching
 * - Non-indexed intents cannot participate in discovery
 *
 * Constructor injects Database, Embedder, and compiled HyDE graph.
 */
import type { Id } from '../interfaces/database.interface.js';
import type { DebugMetaAgent } from '../types/chat-streaming.types.js';
import { type IndexedIntent, type SourceProfileData, type TargetIndex, type CandidateMatch, type EvaluatedCandidate, type EvaluatedOpportunity, type EvaluatedOpportunityActor } from '../states/opportunity.state.js';
import { type CandidateProfile, type EvaluatorEntity, type EvaluatorInput } from '../agents/opportunity.evaluator.js';
import type { OpportunityGraphDatabase } from '../interfaces/database.interface.js';
/** Optional evaluator for testing (avoids LLM calls). */
export type OpportunityEvaluatorLike = {
    invoke?: (sourceProfileContext: string, candidates: CandidateProfile[], options: {
        minScore?: number;
    }) => Promise<Array<{
        sourceId: string;
        candidateId: string;
        score: number;
        reasoning: string;
        valencyRole: 'Agent' | 'Patient' | 'Peer';
    }>>;
    invokeEntityBundle?: (input: EvaluatorInput, options: {
        minScore?: number;
    }) => Promise<Array<{
        reasoning: string;
        score: number;
        actors: Array<{
            userId: string;
            role: 'agent' | 'patient' | 'peer';
            intentId?: string | null;
        }>;
    }>>;
};
import type { Embedder } from '../interfaces/embedder.interface.js';
import type { Opportunity } from '../interfaces/database.interface.js';
import type { NegotiationGraphLike } from "../states/negotiation.state.js";
/** Input shape for the HyDE graph invoke call (query-based embedding). */
export interface HydeGeneratorInvokeInput {
    sourceType: 'query';
    sourceText: string;
    forceRegenerate?: boolean;
    profileContext?: string;
}
/** Optional notifier for opportunity send; when omitted, the real queue is used via dynamic import. */
export type QueueOpportunityNotificationFn = (opportunityId: string, recipientId: string, priority: 'immediate' | 'high' | 'low') => Promise<unknown>;
/**
 * Builds a compact text summary of the discoverer's profile and active intents
 * for use as profileContext in HyDE generation.
 * @param profile - The discoverer's profile data (identity, attributes)
 * @param intents - The discoverer's indexed intents (capped at 5)
 * @returns A context string, or undefined if no meaningful data is available
 */
export declare function buildDiscovererContext(profile: SourceProfileData | null | undefined, intents: IndexedIntent[] | undefined): string | undefined;
/**
 * Factory class to build and compile the Opportunity Graph.
 * Uses dependency injection for testability.
 */
export declare class OpportunityGraphFactory {
    private database;
    private embedder;
    private hydeGenerator;
    private optionalEvaluator?;
    private queueNotification?;
    private negotiationGraph?;
    constructor(database: OpportunityGraphDatabase, embedder: Embedder, hydeGenerator: {
        invoke: (input: HydeGeneratorInvokeInput) => Promise<{
            hydeEmbeddings: Record<string, number[]>;
            lenses?: Array<{
                label: string;
                corpus: 'profiles' | 'intents';
            }>;
            hydeDocuments?: Record<string, {
                hydeText?: string;
                lens?: string;
            }>;
        }>;
    }, optionalEvaluator?: OpportunityEvaluatorLike | undefined, queueNotification?: QueueOpportunityNotificationFn | undefined, negotiationGraph?: NegotiationGraphLike | undefined);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: Id<"users">;
        searchQuery: string | undefined;
        networkId: Id<"networks"> | undefined;
        triggerIntentId: Id<"intents"> | undefined;
        targetUserId: Id<"users"> | undefined;
        onBehalfOfUserId: Id<"users"> | undefined;
        options: import("../states/opportunity.state.js").OpportunityGraphOptions;
        operationMode: "create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send";
        introductionEntities: EvaluatorEntity[];
        introductionHint: string | undefined;
        requiredNetworkId: Id<"networks"> | undefined;
        introductionContext: {
            createdByName?: string;
        } | undefined;
        opportunityId: string | undefined;
        newStatus: string | undefined;
        indexedIntents: IndexedIntent[];
        userNetworks: Id<"networks">[];
        targetIndexes: TargetIndex[];
        indexRelevancyScores: Record<string, number>;
        discoverySource: "profile" | "intent";
        resolvedTriggerIntentId: Id<"intents"> | undefined;
        sourceProfile: SourceProfileData | null;
        resolvedIntentInIndex: boolean;
        createIntentSuggested: boolean;
        suggestedIntentDescription: string | undefined;
        hydeEmbeddings: Record<string, number[]>;
        candidates: CandidateMatch[];
        remainingCandidates: CandidateMatch[];
        discoveryId: string | null;
        evaluatedCandidates: EvaluatedCandidate[];
        evaluatedOpportunities: EvaluatedOpportunity[];
        opportunities: Opportunity[];
        existingBetweenActors: {
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[];
        error: string | undefined;
        readResult: {
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | undefined;
        mutationResult: {
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | undefined;
        trace: {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[];
        agentTimings: DebugMetaAgent[];
    }, {
        userId?: Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users">> | undefined;
        searchQuery?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        networkId?: Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined;
        triggerIntentId?: Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined;
        targetUserId?: Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined;
        onBehalfOfUserId?: Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined;
        options?: import("../states/opportunity.state.js").OpportunityGraphOptions | import("@langchain/langgraph").OverwriteValue<import("../states/opportunity.state.js").OpportunityGraphOptions> | undefined;
        operationMode?: "create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send"> | undefined;
        introductionEntities?: EvaluatorEntity[] | import("@langchain/langgraph").OverwriteValue<EvaluatorEntity[]> | undefined;
        introductionHint?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        requiredNetworkId?: Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined;
        introductionContext?: {
            createdByName?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            createdByName?: string;
        } | undefined> | undefined;
        opportunityId?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        newStatus?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        indexedIntents?: IndexedIntent[] | import("@langchain/langgraph").OverwriteValue<IndexedIntent[]> | undefined;
        userNetworks?: Id<"networks">[] | import("@langchain/langgraph").OverwriteValue<Id<"networks">[]> | undefined;
        targetIndexes?: TargetIndex[] | import("@langchain/langgraph").OverwriteValue<TargetIndex[]> | undefined;
        indexRelevancyScores?: Record<string, number> | import("@langchain/langgraph").OverwriteValue<Record<string, number>> | undefined;
        discoverySource?: "profile" | "intent" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent"> | undefined;
        resolvedTriggerIntentId?: Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined;
        sourceProfile?: SourceProfileData | import("@langchain/langgraph").OverwriteValue<SourceProfileData | null> | null | undefined;
        resolvedIntentInIndex?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        createIntentSuggested?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        suggestedIntentDescription?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        hydeEmbeddings?: Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>> | undefined;
        candidates?: CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]> | undefined;
        remainingCandidates?: CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]> | undefined;
        discoveryId?: string | import("@langchain/langgraph").OverwriteValue<string | null> | null | undefined;
        evaluatedCandidates?: EvaluatedCandidate[] | import("@langchain/langgraph").OverwriteValue<EvaluatedCandidate[]> | undefined;
        evaluatedOpportunities?: EvaluatedOpportunity[] | import("@langchain/langgraph").OverwriteValue<EvaluatedOpportunity[]> | undefined;
        opportunities?: Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]> | undefined;
        existingBetweenActors?: {
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[]> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        readResult?: {
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | import("@langchain/langgraph").OverwriteValue<{
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | undefined> | undefined;
        mutationResult?: {
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | undefined> | undefined;
        trace?: {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[]> | undefined;
        agentTimings?: DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]> | undefined;
    }, "update" | "read" | "__start__" | "prep" | "send" | "scope" | "discovery" | "persist" | "resolve" | "evaluation" | "ranking" | "intro_validation" | "intro_evaluation" | "delete_opp" | "negotiate", {
        userId: import("@langchain/langgraph").BaseChannel<Id<"users">, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users">>, unknown>;
        searchQuery: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        networkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
        triggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
        targetUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
        onBehalfOfUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
        options: import("@langchain/langgraph").BaseChannel<import("../states/opportunity.state.js").OpportunityGraphOptions, import("../states/opportunity.state.js").OpportunityGraphOptions | import("@langchain/langgraph").OverwriteValue<import("../states/opportunity.state.js").OpportunityGraphOptions>, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send", "create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send">, unknown>;
        introductionEntities: import("@langchain/langgraph").BaseChannel<EvaluatorEntity[], EvaluatorEntity[] | import("@langchain/langgraph").OverwriteValue<EvaluatorEntity[]>, unknown>;
        introductionHint: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        requiredNetworkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
        introductionContext: import("@langchain/langgraph").BaseChannel<{
            createdByName?: string;
        } | undefined, {
            createdByName?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            createdByName?: string;
        } | undefined> | undefined, unknown>;
        opportunityId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        newStatus: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        indexedIntents: import("@langchain/langgraph").BaseChannel<IndexedIntent[], IndexedIntent[] | import("@langchain/langgraph").OverwriteValue<IndexedIntent[]>, unknown>;
        userNetworks: import("@langchain/langgraph").BaseChannel<Id<"networks">[], Id<"networks">[] | import("@langchain/langgraph").OverwriteValue<Id<"networks">[]>, unknown>;
        targetIndexes: import("@langchain/langgraph").BaseChannel<TargetIndex[], TargetIndex[] | import("@langchain/langgraph").OverwriteValue<TargetIndex[]>, unknown>;
        indexRelevancyScores: import("@langchain/langgraph").BaseChannel<Record<string, number>, Record<string, number> | import("@langchain/langgraph").OverwriteValue<Record<string, number>>, unknown>;
        discoverySource: import("@langchain/langgraph").BaseChannel<"profile" | "intent", "profile" | "intent" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent">, unknown>;
        resolvedTriggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
        sourceProfile: import("@langchain/langgraph").BaseChannel<SourceProfileData | null, SourceProfileData | import("@langchain/langgraph").OverwriteValue<SourceProfileData | null> | null, unknown>;
        resolvedIntentInIndex: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        createIntentSuggested: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        suggestedIntentDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
        candidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
        remainingCandidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
        discoveryId: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
        evaluatedCandidates: import("@langchain/langgraph").BaseChannel<EvaluatedCandidate[], EvaluatedCandidate[] | import("@langchain/langgraph").OverwriteValue<EvaluatedCandidate[]>, unknown>;
        evaluatedOpportunities: import("@langchain/langgraph").BaseChannel<EvaluatedOpportunity[], EvaluatedOpportunity[] | import("@langchain/langgraph").OverwriteValue<EvaluatedOpportunity[]>, unknown>;
        opportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
        existingBetweenActors: import("@langchain/langgraph").BaseChannel<{
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[], {
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[]>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | undefined, {
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | import("@langchain/langgraph").OverwriteValue<{
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | undefined> | undefined, unknown>;
        mutationResult: import("@langchain/langgraph").BaseChannel<{
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | undefined, {
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | undefined> | undefined, unknown>;
        trace: import("@langchain/langgraph").BaseChannel<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[], {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[]>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, {
        userId: import("@langchain/langgraph").BaseChannel<Id<"users">, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users">>, unknown>;
        searchQuery: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        networkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
        triggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
        targetUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
        onBehalfOfUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
        options: import("@langchain/langgraph").BaseChannel<import("../states/opportunity.state.js").OpportunityGraphOptions, import("../states/opportunity.state.js").OpportunityGraphOptions | import("@langchain/langgraph").OverwriteValue<import("../states/opportunity.state.js").OpportunityGraphOptions>, unknown>;
        operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send", "create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send">, unknown>;
        introductionEntities: import("@langchain/langgraph").BaseChannel<EvaluatorEntity[], EvaluatorEntity[] | import("@langchain/langgraph").OverwriteValue<EvaluatorEntity[]>, unknown>;
        introductionHint: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        requiredNetworkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
        introductionContext: import("@langchain/langgraph").BaseChannel<{
            createdByName?: string;
        } | undefined, {
            createdByName?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            createdByName?: string;
        } | undefined> | undefined, unknown>;
        opportunityId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        newStatus: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        indexedIntents: import("@langchain/langgraph").BaseChannel<IndexedIntent[], IndexedIntent[] | import("@langchain/langgraph").OverwriteValue<IndexedIntent[]>, unknown>;
        userNetworks: import("@langchain/langgraph").BaseChannel<Id<"networks">[], Id<"networks">[] | import("@langchain/langgraph").OverwriteValue<Id<"networks">[]>, unknown>;
        targetIndexes: import("@langchain/langgraph").BaseChannel<TargetIndex[], TargetIndex[] | import("@langchain/langgraph").OverwriteValue<TargetIndex[]>, unknown>;
        indexRelevancyScores: import("@langchain/langgraph").BaseChannel<Record<string, number>, Record<string, number> | import("@langchain/langgraph").OverwriteValue<Record<string, number>>, unknown>;
        discoverySource: import("@langchain/langgraph").BaseChannel<"profile" | "intent", "profile" | "intent" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent">, unknown>;
        resolvedTriggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
        sourceProfile: import("@langchain/langgraph").BaseChannel<SourceProfileData | null, SourceProfileData | import("@langchain/langgraph").OverwriteValue<SourceProfileData | null> | null, unknown>;
        resolvedIntentInIndex: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        createIntentSuggested: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        suggestedIntentDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
        candidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
        remainingCandidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
        discoveryId: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
        evaluatedCandidates: import("@langchain/langgraph").BaseChannel<EvaluatedCandidate[], EvaluatedCandidate[] | import("@langchain/langgraph").OverwriteValue<EvaluatedCandidate[]>, unknown>;
        evaluatedOpportunities: import("@langchain/langgraph").BaseChannel<EvaluatedOpportunity[], EvaluatedOpportunity[] | import("@langchain/langgraph").OverwriteValue<EvaluatedOpportunity[]>, unknown>;
        opportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
        existingBetweenActors: import("@langchain/langgraph").BaseChannel<{
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[], {
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            candidateUserId: Id<"users">;
            networkId: Id<"networks">;
            existingOpportunityId?: Id<"opportunities">;
            existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
        }[]>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | undefined, {
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | import("@langchain/langgraph").OverwriteValue<{
            count: number;
            message?: string;
            opportunities: Array<{
                id: string;
                indexName: string;
                connectedWith: string[];
                suggestedBy: string | null;
                reasoning: string;
                status: string;
                category: string;
                confidence: number | null;
                source: string | null;
            }>;
        } | undefined> | undefined, unknown>;
        mutationResult: import("@langchain/langgraph").BaseChannel<{
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | undefined, {
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            success: boolean;
            message?: string;
            opportunityId?: string;
            notified?: string[];
            error?: string;
        } | undefined> | undefined, unknown>;
        trace: import("@langchain/langgraph").BaseChannel<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[], {
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            node: string;
            detail?: string;
            data?: Record<string, unknown>;
        }[]>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        prep: import("@langchain/langgraph").UpdateType<{
            userId: import("@langchain/langgraph").BaseChannel<Id<"users">, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users">>, unknown>;
            searchQuery: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            networkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
            triggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
            targetUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
            onBehalfOfUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
            options: import("@langchain/langgraph").BaseChannel<import("../states/opportunity.state.js").OpportunityGraphOptions, import("../states/opportunity.state.js").OpportunityGraphOptions | import("@langchain/langgraph").OverwriteValue<import("../states/opportunity.state.js").OpportunityGraphOptions>, unknown>;
            operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send", "create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send">, unknown>;
            introductionEntities: import("@langchain/langgraph").BaseChannel<EvaluatorEntity[], EvaluatorEntity[] | import("@langchain/langgraph").OverwriteValue<EvaluatorEntity[]>, unknown>;
            introductionHint: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            requiredNetworkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
            introductionContext: import("@langchain/langgraph").BaseChannel<{
                createdByName?: string;
            } | undefined, {
                createdByName?: string;
            } | import("@langchain/langgraph").OverwriteValue<{
                createdByName?: string;
            } | undefined> | undefined, unknown>;
            opportunityId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            newStatus: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            indexedIntents: import("@langchain/langgraph").BaseChannel<IndexedIntent[], IndexedIntent[] | import("@langchain/langgraph").OverwriteValue<IndexedIntent[]>, unknown>;
            userNetworks: import("@langchain/langgraph").BaseChannel<Id<"networks">[], Id<"networks">[] | import("@langchain/langgraph").OverwriteValue<Id<"networks">[]>, unknown>;
            targetIndexes: import("@langchain/langgraph").BaseChannel<TargetIndex[], TargetIndex[] | import("@langchain/langgraph").OverwriteValue<TargetIndex[]>, unknown>;
            indexRelevancyScores: import("@langchain/langgraph").BaseChannel<Record<string, number>, Record<string, number> | import("@langchain/langgraph").OverwriteValue<Record<string, number>>, unknown>;
            discoverySource: import("@langchain/langgraph").BaseChannel<"profile" | "intent", "profile" | "intent" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent">, unknown>;
            resolvedTriggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
            sourceProfile: import("@langchain/langgraph").BaseChannel<SourceProfileData | null, SourceProfileData | import("@langchain/langgraph").OverwriteValue<SourceProfileData | null> | null, unknown>;
            resolvedIntentInIndex: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
            createIntentSuggested: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
            suggestedIntentDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
            candidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
            remainingCandidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
            discoveryId: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
            evaluatedCandidates: import("@langchain/langgraph").BaseChannel<EvaluatedCandidate[], EvaluatedCandidate[] | import("@langchain/langgraph").OverwriteValue<EvaluatedCandidate[]>, unknown>;
            evaluatedOpportunities: import("@langchain/langgraph").BaseChannel<EvaluatedOpportunity[], EvaluatedOpportunity[] | import("@langchain/langgraph").OverwriteValue<EvaluatedOpportunity[]>, unknown>;
            opportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
            existingBetweenActors: import("@langchain/langgraph").BaseChannel<{
                candidateUserId: Id<"users">;
                networkId: Id<"networks">;
                existingOpportunityId?: Id<"opportunities">;
                existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
            }[], {
                candidateUserId: Id<"users">;
                networkId: Id<"networks">;
                existingOpportunityId?: Id<"opportunities">;
                existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
            }[] | import("@langchain/langgraph").OverwriteValue<{
                candidateUserId: Id<"users">;
                networkId: Id<"networks">;
                existingOpportunityId?: Id<"opportunities">;
                existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
            }[]>, unknown>;
            error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            readResult: import("@langchain/langgraph").BaseChannel<{
                count: number;
                message?: string;
                opportunities: Array<{
                    id: string;
                    indexName: string;
                    connectedWith: string[];
                    suggestedBy: string | null;
                    reasoning: string;
                    status: string;
                    category: string;
                    confidence: number | null;
                    source: string | null;
                }>;
            } | undefined, {
                count: number;
                message?: string;
                opportunities: Array<{
                    id: string;
                    indexName: string;
                    connectedWith: string[];
                    suggestedBy: string | null;
                    reasoning: string;
                    status: string;
                    category: string;
                    confidence: number | null;
                    source: string | null;
                }>;
            } | import("@langchain/langgraph").OverwriteValue<{
                count: number;
                message?: string;
                opportunities: Array<{
                    id: string;
                    indexName: string;
                    connectedWith: string[];
                    suggestedBy: string | null;
                    reasoning: string;
                    status: string;
                    category: string;
                    confidence: number | null;
                    source: string | null;
                }>;
            } | undefined> | undefined, unknown>;
            mutationResult: import("@langchain/langgraph").BaseChannel<{
                success: boolean;
                message?: string;
                opportunityId?: string;
                notified?: string[];
                error?: string;
            } | undefined, {
                success: boolean;
                message?: string;
                opportunityId?: string;
                notified?: string[];
                error?: string;
            } | import("@langchain/langgraph").OverwriteValue<{
                success: boolean;
                message?: string;
                opportunityId?: string;
                notified?: string[];
                error?: string;
            } | undefined> | undefined, unknown>;
            trace: import("@langchain/langgraph").BaseChannel<{
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[], {
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[] | import("@langchain/langgraph").OverwriteValue<{
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[]>, unknown>;
            agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
        }>;
        scope: {
            targetIndexes: never[];
            error: string;
            indexRelevancyScores?: undefined;
            agentTimings?: undefined;
            trace?: undefined;
        } | {
            targetIndexes: TargetIndex[];
            indexRelevancyScores: Record<string, number>;
            agentTimings: DebugMetaAgent[];
            trace: {
                node: string;
                detail: string;
                data: {
                    totalMembers: number;
                };
            }[];
            error?: undefined;
        } | {
            targetIndexes: TargetIndex[];
            indexRelevancyScores: Record<string, number>;
            trace: {
                node: string;
                detail: string;
                data: {
                    totalMembers: number;
                };
            }[];
            error?: undefined;
            agentTimings?: undefined;
        } | {
            targetIndexes: never[];
            error: string;
            trace: {
                node: string;
                detail: string;
                data: {
                    error: string;
                };
            }[];
            indexRelevancyScores?: undefined;
            agentTimings?: undefined;
        };
        resolve: {
            resolvedTriggerIntentId: Id<"intents">;
            resolvedIntentInIndex: boolean;
            discoverySource: "profile" | "intent";
            error?: undefined;
            trace?: undefined;
        } | {
            resolvedTriggerIntentId: undefined;
            resolvedIntentInIndex: boolean;
            discoverySource: "profile";
            error?: undefined;
            trace?: undefined;
        } | {
            resolvedTriggerIntentId: undefined;
            resolvedIntentInIndex: boolean;
            discoverySource: "profile";
            error: string;
            trace: {
                node: string;
                detail: string;
                data: {
                    error: string;
                };
            }[];
        };
        discovery: {
            candidates: never[];
            trace?: undefined;
            hydeEmbeddings?: undefined;
            error?: undefined;
        } | {
            candidates: CandidateMatch[];
            trace: {
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[];
            hydeEmbeddings?: undefined;
            error?: undefined;
        } | {
            hydeEmbeddings: Record<string, number[]>;
            candidates: never[];
            trace?: undefined;
            error?: undefined;
        } | {
            hydeEmbeddings: Record<string, number[]>;
            candidates: CandidateMatch[];
            trace: {
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[];
            error?: undefined;
        } | {
            candidates: never[];
            error: string;
            trace: {
                node: string;
                detail: string;
                data: {
                    error: string;
                };
            }[];
            hydeEmbeddings?: undefined;
        };
        evaluation: {
            evaluatedOpportunities: never[];
            agentTimings: never[];
            remainingCandidates?: undefined;
            trace?: undefined;
            error?: undefined;
        } | {
            evaluatedOpportunities: EvaluatedOpportunity[];
            remainingCandidates: CandidateMatch[];
            trace: {
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[];
            agentTimings: DebugMetaAgent[];
            error?: undefined;
        } | {
            evaluatedOpportunities: never[];
            error: string;
            trace: {
                node: string;
                detail: string;
                data: {
                    error: string;
                    candidateCount: number;
                    durationMs: number;
                };
            }[];
            agentTimings: DebugMetaAgent[];
            remainingCandidates?: undefined;
        };
        ranking: {
            evaluatedOpportunities: EvaluatedOpportunity[];
            error?: undefined;
            trace?: undefined;
        } | {
            evaluatedOpportunities: never[];
            error: string;
            trace: {
                node: string;
                detail: string;
                data: {
                    error: string;
                };
            }[];
        };
        intro_validation: {
            error: string;
            trace?: undefined;
        } | {
            error?: undefined;
            trace?: undefined;
        } | {
            error: string;
            trace: {
                node: string;
                detail: string;
                data: {
                    error: string;
                };
            }[];
        };
        intro_evaluation: {
            evaluatedOpportunities: never[];
            agentTimings: never[];
            error?: undefined;
            introductionContext?: undefined;
            options?: undefined;
            trace?: undefined;
        } | {
            evaluatedOpportunities: never[];
            error: string;
            agentTimings: never[];
            introductionContext?: undefined;
            options?: undefined;
            trace?: undefined;
        } | {
            evaluatedOpportunities: {
                actors: EvaluatedOpportunityActor[];
                score: number;
                reasoning: string;
            }[];
            introductionContext: {
                createdByName: string | undefined;
            };
            options: {
                initialStatus: import("../interfaces/database.interface.js").OpportunityStatus;
                minScore?: number;
                limit?: number;
                lenses?: import("../agents/lens.inferrer.js").Lens[];
                hydeDescription?: string;
                existingOpportunities?: string;
                conversationId?: string;
            };
            agentTimings: DebugMetaAgent[];
            trace: {
                node: string;
                detail: string;
                data: {
                    error: string;
                };
            }[];
            error?: undefined;
        } | {
            evaluatedOpportunities: EvaluatedOpportunity[];
            introductionContext: {
                createdByName: string | undefined;
            };
            options: {
                initialStatus: import("../interfaces/database.interface.js").OpportunityStatus;
                minScore?: number;
                limit?: number;
                lenses?: import("../agents/lens.inferrer.js").Lens[];
                hydeDescription?: string;
                existingOpportunities?: string;
                conversationId?: string;
            };
            agentTimings: DebugMetaAgent[];
            error?: undefined;
            trace?: undefined;
        };
        persist: import("@langchain/langgraph").UpdateType<{
            userId: import("@langchain/langgraph").BaseChannel<Id<"users">, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users">>, unknown>;
            searchQuery: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            networkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
            triggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
            targetUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
            onBehalfOfUserId: import("@langchain/langgraph").BaseChannel<Id<"users"> | undefined, Id<"users"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | undefined> | undefined, unknown>;
            options: import("@langchain/langgraph").BaseChannel<import("../states/opportunity.state.js").OpportunityGraphOptions, import("../states/opportunity.state.js").OpportunityGraphOptions | import("@langchain/langgraph").OverwriteValue<import("../states/opportunity.state.js").OpportunityGraphOptions>, unknown>;
            operationMode: import("@langchain/langgraph").BaseChannel<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send", "create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send" | import("@langchain/langgraph").OverwriteValue<"create" | "update" | "delete" | "read" | "create_introduction" | "continue_discovery" | "send">, unknown>;
            introductionEntities: import("@langchain/langgraph").BaseChannel<EvaluatorEntity[], EvaluatorEntity[] | import("@langchain/langgraph").OverwriteValue<EvaluatorEntity[]>, unknown>;
            introductionHint: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            requiredNetworkId: import("@langchain/langgraph").BaseChannel<Id<"networks"> | undefined, Id<"networks"> | import("@langchain/langgraph").OverwriteValue<Id<"networks"> | undefined> | undefined, unknown>;
            introductionContext: import("@langchain/langgraph").BaseChannel<{
                createdByName?: string;
            } | undefined, {
                createdByName?: string;
            } | import("@langchain/langgraph").OverwriteValue<{
                createdByName?: string;
            } | undefined> | undefined, unknown>;
            opportunityId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            newStatus: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            indexedIntents: import("@langchain/langgraph").BaseChannel<IndexedIntent[], IndexedIntent[] | import("@langchain/langgraph").OverwriteValue<IndexedIntent[]>, unknown>;
            userNetworks: import("@langchain/langgraph").BaseChannel<Id<"networks">[], Id<"networks">[] | import("@langchain/langgraph").OverwriteValue<Id<"networks">[]>, unknown>;
            targetIndexes: import("@langchain/langgraph").BaseChannel<TargetIndex[], TargetIndex[] | import("@langchain/langgraph").OverwriteValue<TargetIndex[]>, unknown>;
            indexRelevancyScores: import("@langchain/langgraph").BaseChannel<Record<string, number>, Record<string, number> | import("@langchain/langgraph").OverwriteValue<Record<string, number>>, unknown>;
            discoverySource: import("@langchain/langgraph").BaseChannel<"profile" | "intent", "profile" | "intent" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent">, unknown>;
            resolvedTriggerIntentId: import("@langchain/langgraph").BaseChannel<Id<"intents"> | undefined, Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"intents"> | undefined> | undefined, unknown>;
            sourceProfile: import("@langchain/langgraph").BaseChannel<SourceProfileData | null, SourceProfileData | import("@langchain/langgraph").OverwriteValue<SourceProfileData | null> | null, unknown>;
            resolvedIntentInIndex: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
            createIntentSuggested: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
            suggestedIntentDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
            candidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
            remainingCandidates: import("@langchain/langgraph").BaseChannel<CandidateMatch[], CandidateMatch[] | import("@langchain/langgraph").OverwriteValue<CandidateMatch[]>, unknown>;
            discoveryId: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
            evaluatedCandidates: import("@langchain/langgraph").BaseChannel<EvaluatedCandidate[], EvaluatedCandidate[] | import("@langchain/langgraph").OverwriteValue<EvaluatedCandidate[]>, unknown>;
            evaluatedOpportunities: import("@langchain/langgraph").BaseChannel<EvaluatedOpportunity[], EvaluatedOpportunity[] | import("@langchain/langgraph").OverwriteValue<EvaluatedOpportunity[]>, unknown>;
            opportunities: import("@langchain/langgraph").BaseChannel<Opportunity[], Opportunity[] | import("@langchain/langgraph").OverwriteValue<Opportunity[]>, unknown>;
            existingBetweenActors: import("@langchain/langgraph").BaseChannel<{
                candidateUserId: Id<"users">;
                networkId: Id<"networks">;
                existingOpportunityId?: Id<"opportunities">;
                existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
            }[], {
                candidateUserId: Id<"users">;
                networkId: Id<"networks">;
                existingOpportunityId?: Id<"opportunities">;
                existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
            }[] | import("@langchain/langgraph").OverwriteValue<{
                candidateUserId: Id<"users">;
                networkId: Id<"networks">;
                existingOpportunityId?: Id<"opportunities">;
                existingStatus?: import("../interfaces/database.interface.js").OpportunityStatus;
            }[]>, unknown>;
            error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
            readResult: import("@langchain/langgraph").BaseChannel<{
                count: number;
                message?: string;
                opportunities: Array<{
                    id: string;
                    indexName: string;
                    connectedWith: string[];
                    suggestedBy: string | null;
                    reasoning: string;
                    status: string;
                    category: string;
                    confidence: number | null;
                    source: string | null;
                }>;
            } | undefined, {
                count: number;
                message?: string;
                opportunities: Array<{
                    id: string;
                    indexName: string;
                    connectedWith: string[];
                    suggestedBy: string | null;
                    reasoning: string;
                    status: string;
                    category: string;
                    confidence: number | null;
                    source: string | null;
                }>;
            } | import("@langchain/langgraph").OverwriteValue<{
                count: number;
                message?: string;
                opportunities: Array<{
                    id: string;
                    indexName: string;
                    connectedWith: string[];
                    suggestedBy: string | null;
                    reasoning: string;
                    status: string;
                    category: string;
                    confidence: number | null;
                    source: string | null;
                }>;
            } | undefined> | undefined, unknown>;
            mutationResult: import("@langchain/langgraph").BaseChannel<{
                success: boolean;
                message?: string;
                opportunityId?: string;
                notified?: string[];
                error?: string;
            } | undefined, {
                success: boolean;
                message?: string;
                opportunityId?: string;
                notified?: string[];
                error?: string;
            } | import("@langchain/langgraph").OverwriteValue<{
                success: boolean;
                message?: string;
                opportunityId?: string;
                notified?: string[];
                error?: string;
            } | undefined> | undefined, unknown>;
            trace: import("@langchain/langgraph").BaseChannel<{
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[], {
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[] | import("@langchain/langgraph").OverwriteValue<{
                node: string;
                detail?: string;
                data?: Record<string, unknown>;
            }[]>, unknown>;
            agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
        }>;
        read: {
            readResult: {
                count: number;
                message: string;
                opportunities: {
                    id: string;
                    indexName: string;
                    connectedWith: string[];
                    suggestedBy: string | null;
                    reasoning: string;
                    status: import("../interfaces/database.interface.js").OpportunityStatus;
                    category: string;
                    confidence: number | null;
                    source: string | null;
                }[];
            };
        };
        update: {
            mutationResult: {
                success: boolean;
                error: string;
                opportunityId?: undefined;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                opportunityId: string;
                message: string;
                error?: undefined;
            };
        };
        delete_opp: {
            mutationResult: {
                success: boolean;
                error: string;
                opportunityId?: undefined;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                opportunityId: string;
                message: string;
                error?: undefined;
            };
        };
        send: {
            mutationResult: {
                success: boolean;
                error: string;
                opportunityId?: undefined;
                notified?: undefined;
                message?: undefined;
            };
        } | {
            mutationResult: {
                success: boolean;
                opportunityId: string;
                notified: Id<"users">[];
                message: string;
                error?: undefined;
            };
        };
        negotiate: {
            evaluatedOpportunities?: undefined;
        } | {
            evaluatedOpportunities: EvaluatedOpportunity[];
        };
    }, unknown, unknown>;
}
//# sourceMappingURL=opportunity.graph.d.ts.map