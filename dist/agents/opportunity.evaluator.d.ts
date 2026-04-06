import type { Runnable } from "@langchain/core/runnables";
import { z } from "zod";
import type { Lens } from "./lens.inferrer.js";
import type { OpportunityStatus } from "../interfaces/database.interface.js";
declare const OpportunitySchema: z.ZodObject<{
    reasoning: z.ZodString;
    score: z.ZodNumber;
    valencyRole: z.ZodEnum<["Agent", "Patient", "Peer"]>;
    sourceId: z.ZodString;
    candidateId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    sourceId: string;
    score: number;
    valencyRole: "Agent" | "Patient" | "Peer";
    candidateId: string;
}, {
    reasoning: string;
    sourceId: string;
    score: number;
    valencyRole: "Agent" | "Patient" | "Peer";
    candidateId: string;
}>;
export interface EvaluatorEntity {
    userId: string;
    profile: {
        name?: string;
        bio?: string;
        location?: string;
        interests?: string[];
        skills?: string[];
        context?: string;
    };
    intents?: Array<{
        intentId: string;
        payload: string;
        summary?: string;
    }>;
    indexId: string;
    ragScore?: number;
    matchedVia?: string;
}
export interface EvaluatorInput {
    /** The user who triggered discovery (for context, not special treatment). */
    discovererId: string;
    /** All relevant entities. In introduction mode, only the people being introduced (no introducer). */
    entities: EvaluatorEntity[];
    /** Existing opportunities for deduplication. */
    existingOpportunities?: string;
    /** When true, DISCOVERER is the introducer; reasoning and actors must be only among ENTITIES. */
    introductionMode?: boolean;
    /** Name of the introducer (for attribution in reasoning when introductionMode is true). */
    introducerName?: string;
    /** Optional hint/context from the introducer about why these people should meet. */
    introductionHint?: string;
    /** Optional discovery query (e.g. from chat). When set, only suggest opportunities where candidates clearly match this request. */
    discoveryQuery?: string;
}
declare const ActorSchema: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodEnum<["agent", "patient", "peer"]>;
    intentId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    intentId: string | null;
    role: "agent" | "patient" | "peer";
}, {
    userId: string;
    intentId: string | null;
    role: "agent" | "patient" | "peer";
}>;
declare const OpportunityWithActorsSchema: z.ZodObject<{
    reasoning: z.ZodString;
    score: z.ZodNumber;
    actors: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        role: z.ZodEnum<["agent", "patient", "peer"]>;
        intentId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        intentId: string | null;
        role: "agent" | "patient" | "peer";
    }, {
        userId: string;
        intentId: string | null;
        role: "agent" | "patient" | "peer";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    score: number;
    actors: {
        userId: string;
        intentId: string | null;
        role: "agent" | "patient" | "peer";
    }[];
}, {
    reasoning: string;
    score: number;
    actors: {
        userId: string;
        intentId: string | null;
        role: "agent" | "patient" | "peer";
    }[];
}>;
declare const entityBundleResponseFormat: z.ZodObject<{
    opportunities: z.ZodArray<z.ZodObject<{
        reasoning: z.ZodString;
        score: z.ZodNumber;
        actors: z.ZodArray<z.ZodObject<{
            userId: z.ZodString;
            role: z.ZodEnum<["agent", "patient", "peer"]>;
            intentId: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            userId: string;
            intentId: string | null;
            role: "agent" | "patient" | "peer";
        }, {
            userId: string;
            intentId: string | null;
            role: "agent" | "patient" | "peer";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        reasoning: string;
        score: number;
        actors: {
            userId: string;
            intentId: string | null;
            role: "agent" | "patient" | "peer";
        }[];
    }, {
        reasoning: string;
        score: number;
        actors: {
            userId: string;
            intentId: string | null;
            role: "agent" | "patient" | "peer";
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    opportunities: {
        reasoning: string;
        score: number;
        actors: {
            userId: string;
            intentId: string | null;
            role: "agent" | "patient" | "peer";
        }[];
    }[];
}, {
    opportunities: {
        reasoning: string;
        score: number;
        actors: {
            userId: string;
            intentId: string | null;
            role: "agent" | "patient" | "peer";
        }[];
    }[];
}>;
export type EvaluatorActor = z.infer<typeof ActorSchema>;
export type EvaluatedOpportunityWithActors = z.infer<typeof OpportunityWithActorsSchema>;
export type EvaluatorOutputBundle = z.infer<typeof entityBundleResponseFormat>;
type Opportunity = z.infer<typeof OpportunitySchema>;
export interface CandidateProfile {
    userId: string;
    identity?: {
        name?: string;
        bio?: string;
        location?: string;
    };
    attributes?: {
        interests?: string[];
        skills?: string[];
    };
    narrative?: {
        context?: string;
    };
    score?: number;
}
interface OpportunityEvaluatorOptions {
    minScore?: number;
    limit?: number;
    hydeDescription?: string;
    /** Pre-inferred lenses (if not provided, lens inference runs automatically in HyDE graph). */
    lenses?: Lens[];
    existingOpportunities?: string;
    candidates?: CandidateProfile[];
    filter?: Record<string, unknown>;
    initialStatus?: OpportunityStatus;
}
/** Optional test double for entity-bundle model (avoids live LLM in unit tests). */
export type OpportunityEvaluatorOptionsConstructor = {
    entityBundleModel?: Runnable;
};
export declare class OpportunityEvaluator {
    private model;
    private entityBundleModel;
    constructor(options?: OpportunityEvaluatorOptionsConstructor);
    /**
     * Main Entry Point: Batch analysis of candidates.
     *
     * @param sourceProfileContext - The profile context string of the user we are finding opportunities FOR.
     * @param candidates - List of potential matches to evaluate.
     * @param options - Config (minScore, valid types, etc).
     * @returns A sorted list of high-value `Opportunity` objects.
     */
    invoke(sourceProfileContext: string, candidates: CandidateProfile[], options: OpportunityEvaluatorOptions): Promise<Opportunity[]>;
    /**
     * Analyze a single match pair using the primary Agent model.
     */
    private analyzeMatch;
    /**
     * Entity-bundle entry point (C3): single LLM call with all entities, returns 0..N opportunities with actors.
     */
    invokeEntityBundle(input: EvaluatorInput, options?: {
        minScore?: number;
        returnAll?: boolean;
    }): Promise<EvaluatedOpportunityWithActors[]>;
    /**
     * Factory method to expose the agent as a LangChain tool.
     * Simplified to only accept direct evaluation arguments.
     * PURE: Does not perform any database lookups.
     */
    static asTool(): import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
        sourceProfileContext: z.ZodString;
        candidatesJson: z.ZodOptional<z.ZodString>;
        minScore: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sourceProfileContext: string;
        minScore?: number | undefined;
        candidatesJson?: string | undefined;
    }, {
        sourceProfileContext: string;
        minScore?: number | undefined;
        candidatesJson?: string | undefined;
    }>, {
        sourceProfileContext: string;
        minScore?: number | undefined;
        candidatesJson?: string | undefined;
    }, {
        sourceProfileContext: string;
        minScore?: number | undefined;
        candidatesJson?: string | undefined;
    }, {
        reasoning: string;
        sourceId: string;
        score: number;
        valencyRole: "Agent" | "Patient" | "Peer";
        candidateId: string;
    }[], unknown, "opportunity_evaluator">;
}
export {};
//# sourceMappingURL=opportunity.evaluator.d.ts.map