/**
 * HyDE Graph: cache-aware hypothetical document generation with lens inference.
 *
 * Flow: infer_lenses → check_cache → (generate_missing if needed) → embed → cache_results.
 * Constructor injects Database, Embedder, Cache, LensInferrer, HydeGenerator.
 */
import { type HydeDocumentState } from '../states/hyde.state.js';
import { LensInferrer } from '../agents/lens.inferrer.js';
import { HydeGenerator } from '../agents/hyde.generator.js';
import type { HydeGraphDatabase } from '../interfaces/database.interface.js';
import type { EmbeddingGenerator } from '../interfaces/embedder.interface.js';
import type { HydeCache } from '../interfaces/cache.interface.js';
import type { DebugMetaAgent } from '../types/chat-streaming.types.js';
/**
 * Factory for the HyDE generation graph.
 * Injects Database, Embedder, Cache, LensInferrer, and HydeGenerator.
 */
export declare class HydeGraphFactory {
    private database;
    private embedder;
    private cache;
    private inferrer;
    private generator;
    constructor(database: HydeGraphDatabase, embedder: EmbeddingGenerator, cache: HydeCache, inferrer: LensInferrer, generator: HydeGenerator);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        sourceType: "profile" | "intent" | "query";
        sourceId: import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | undefined;
        sourceText: string;
        profileContext: string | undefined;
        maxLenses: number;
        forceRegenerate: boolean;
        lenses: import("../agents/lens.inferrer.js").Lens[];
        hydeDocuments: Record<string, HydeDocumentState>;
        hydeEmbeddings: Record<string, number[]>;
        error: string | undefined;
        agentTimings: DebugMetaAgent[];
    }, {
        sourceType?: "profile" | "intent" | "query" | undefined;
        sourceId?: import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | undefined> | undefined;
        sourceText?: string | undefined;
        profileContext?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        maxLenses?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
        forceRegenerate?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        lenses?: import("../agents/lens.inferrer.js").Lens[] | import("@langchain/langgraph").OverwriteValue<import("../agents/lens.inferrer.js").Lens[]> | undefined;
        hydeDocuments?: Record<string, HydeDocumentState> | import("@langchain/langgraph").OverwriteValue<Record<string, HydeDocumentState>> | undefined;
        hydeEmbeddings?: Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        agentTimings?: DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]> | undefined;
    }, "__start__" | "infer_lenses" | "check_cache" | "generate_missing" | "embed" | "cache_results", {
        sourceType: {
            (annotation: import("@langchain/langgraph").SingleReducer<"profile" | "intent" | "query", "profile" | "intent" | "query">): import("@langchain/langgraph").BaseChannel<"profile" | "intent" | "query", "profile" | "intent" | "query" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent" | "query">, unknown>;
            (): import("@langchain/langgraph").LastValue<"profile" | "intent" | "query">;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        sourceId: import("@langchain/langgraph").BaseChannel<import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | undefined, import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | undefined> | undefined, unknown>;
        sourceText: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        profileContext: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        maxLenses: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        forceRegenerate: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        lenses: import("@langchain/langgraph").BaseChannel<import("../agents/lens.inferrer.js").Lens[], import("../agents/lens.inferrer.js").Lens[] | import("@langchain/langgraph").OverwriteValue<import("../agents/lens.inferrer.js").Lens[]>, unknown>;
        hydeDocuments: import("@langchain/langgraph").BaseChannel<Record<string, HydeDocumentState>, Record<string, HydeDocumentState> | import("@langchain/langgraph").OverwriteValue<Record<string, HydeDocumentState>>, unknown>;
        hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, {
        sourceType: {
            (annotation: import("@langchain/langgraph").SingleReducer<"profile" | "intent" | "query", "profile" | "intent" | "query">): import("@langchain/langgraph").BaseChannel<"profile" | "intent" | "query", "profile" | "intent" | "query" | import("@langchain/langgraph").OverwriteValue<"profile" | "intent" | "query">, unknown>;
            (): import("@langchain/langgraph").LastValue<"profile" | "intent" | "query">;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        sourceId: import("@langchain/langgraph").BaseChannel<import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | undefined, import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | import("@langchain/langgraph").OverwriteValue<import("../interfaces/database.interface.js").Id<"users"> | import("../interfaces/database.interface.js").Id<"intents"> | undefined> | undefined, unknown>;
        sourceText: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        profileContext: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        maxLenses: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        forceRegenerate: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        lenses: import("@langchain/langgraph").BaseChannel<import("../agents/lens.inferrer.js").Lens[], import("../agents/lens.inferrer.js").Lens[] | import("@langchain/langgraph").OverwriteValue<import("../agents/lens.inferrer.js").Lens[]>, unknown>;
        hydeDocuments: import("@langchain/langgraph").BaseChannel<Record<string, HydeDocumentState>, Record<string, HydeDocumentState> | import("@langchain/langgraph").OverwriteValue<Record<string, HydeDocumentState>>, unknown>;
        hydeEmbeddings: import("@langchain/langgraph").BaseChannel<Record<string, number[]>, Record<string, number[]> | import("@langchain/langgraph").OverwriteValue<Record<string, number[]>>, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        infer_lenses: {
            lenses: import("../agents/lens.inferrer.js").Lens[];
            agentTimings: DebugMetaAgent[];
        };
        check_cache: {
            hydeDocuments: Record<string, HydeDocumentState>;
        };
        generate_missing: {
            hydeDocuments: {
                [x: string]: HydeDocumentState;
            };
            agentTimings: DebugMetaAgent[];
        };
        embed: {
            hydeDocuments: Record<string, HydeDocumentState>;
            hydeEmbeddings: Record<string, number[]>;
        };
        cache_results: {};
    }, unknown, unknown>;
}
//# sourceMappingURL=hyde.graph.d.ts.map