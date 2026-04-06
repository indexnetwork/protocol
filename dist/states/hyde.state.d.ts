/**
 * HyDE Graph state: cache-aware hypothetical document generation.
 * Used by the HyDE graph for infer_lenses → check_cache → generate_missing → embed → cache_results.
 */
import type { Id } from '../interfaces/database.interface';
import type { Lens, HydeTargetCorpus } from '../agents/lens.inferrer';
import type { DebugMetaAgent } from '../types/chat-streaming.types';
/** Single HyDE document (text + embedding) for one lens. */
export interface HydeDocumentState {
    lens: string;
    targetCorpus: HydeTargetCorpus;
    hydeText: string;
    hydeEmbedding: number[];
}
/** State for the HyDE generation graph. */
export declare const HydeGraphState: import("@langchain/langgraph").AnnotationRoot<{
    /** Source type: intent, profile, or ad-hoc query. */
    sourceType: {
        (annotation: import("@langchain/langgraph").SingleReducer<"profile" | "intent" | "query", "profile" | "intent" | "query">): import("@langchain/langgraph").BaseChannel<"profile" | "intent" | "query", "profile" | "intent" | "query" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent" | "query">, unknown>;
        (): import("@langchain/langgraph").LastValue<"profile" | "intent" | "query">;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /** Source entity ID (e.g. intent ID, user ID). Omitted for ad-hoc query. */
    sourceId: import("@langchain/langgraph").BaseChannel<Id<"users"> | Id<"intents"> | undefined, Id<"users"> | Id<"intents"> | import("@langchain/langgraph").OverwriteValue<Id<"users"> | Id<"intents"> | undefined> | undefined, unknown>;
    /** Source text to generate HyDE from (intent payload, profile summary, or query). */
    sourceText: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /** Optional profile context for lens inference (user's profile summary). */
    profileContext: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Maximum number of lenses to infer (default 3). */
    maxLenses: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    /** When true, skip cache/DB and regenerate all lenses. */
    forceRegenerate: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /** Inferred lenses from the LensInferrer agent. */
    lenses: import("@langchain/langgraph").BaseChannel<Lens[], Lens[] | import("@langchain/langgraph").OverwriteValue<Lens[]>, unknown>;
    /**
     * HyDE documents per lens (from cache, DB, or newly generated).
     * Keyed by lens label; values include hydeText and hydeEmbedding.
     */
    hydeDocuments: import("@langchain/langgraph").BaseChannel<Record<string, HydeDocumentState>, Record<string, HydeDocumentState> | import("@langchain/langgraph").OverwriteValue<Record<string, HydeDocumentState>>, unknown>;
    /**
     * Final embeddings per lens (convenience output for search).
     * Populated by embed node; used by opportunity graph.
     */
    hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
    /** Non-fatal error message. */
    error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
}>;
//# sourceMappingURL=hyde.state.d.ts.map