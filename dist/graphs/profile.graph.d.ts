import { ProfileDocument } from "../agents/profile.generator.js";
import { ProfileGraphDatabase } from "../interfaces/database.interface.js";
import { Embedder } from "../interfaces/embedder.interface.js";
import { Scraper } from "../interfaces/scraper.interface.js";
import type { ProfileEnricher } from "../interfaces/enrichment.interface.js";
import type { DebugMetaAgent } from "../types/chat-streaming.types.js";
/**
 * Factory class to build and compile the Profile Generation Graph.
 *
 * Flow:
 * 1. check_state - Detect what's missing (profile, embeddings, hyde)
 * 2. Conditional routing based on operation mode and missing components:
 *    - Query mode: Return immediately (fast path)
 *    - Write mode: Generate only what's needed
 * 3. Profile generation (if needed)
 * 4. Profile embedding (if needed)
 * 5. HyDE generation (if needed or profile updated)
 * 6. HyDE embedding (if needed)
 *
 * Key Features:
 * - Read/Write separation (query vs write)
 * - Conditional generation (skip expensive operations if data exists)
 * - Automatic hyde regeneration when profile is updated
 */
export declare class ProfileGraphFactory {
    private database;
    private embedder;
    private scraper;
    private enricher?;
    constructor(database: ProfileGraphDatabase, embedder: Embedder, scraper: Scraper, enricher?: ProfileEnricher | undefined);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        userId: string;
        operationMode: "query" | "write" | "generate";
        forceUpdate: boolean;
        prePopulatedProfile: {
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | undefined;
        objective: string | undefined;
        input: string | undefined;
        profile: ProfileDocument | undefined;
        needsProfileGeneration: boolean;
        needsProfileEmbedding: boolean;
        needsHydeGeneration: boolean;
        needsHydeEmbedding: boolean;
        needsUserInfo: boolean;
        missingUserInfo: string[];
        hydeDescription: string | undefined;
        error: string | undefined;
        operationsPerformed: {
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        };
        agentTimings: DebugMetaAgent[];
        readResult: {
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | undefined;
    }, {
        userId?: string | undefined;
        operationMode?: "query" | "write" | "generate" | import("@langchain/langgraph").OverwriteValue<"query" | "write" | "generate"> | undefined;
        forceUpdate?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        prePopulatedProfile?: {
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | import("@langchain/langgraph").OverwriteValue<{
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | undefined> | undefined;
        objective?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        input?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        profile?: ProfileDocument | import("@langchain/langgraph").OverwriteValue<ProfileDocument | undefined> | undefined;
        needsProfileGeneration?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        needsProfileEmbedding?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        needsHydeGeneration?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        needsHydeEmbedding?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        needsUserInfo?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
        missingUserInfo?: string[] | import("@langchain/langgraph").OverwriteValue<string[]> | undefined;
        hydeDescription?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        error?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
        operationsPerformed?: {
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        } | import("@langchain/langgraph").OverwriteValue<{
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        }> | undefined;
        agentTimings?: DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]> | undefined;
        readResult?: {
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | undefined> | undefined;
    }, "__start__" | "check_state" | "scrape" | "auto_generate" | "use_prepopulated_profile" | "generate_profile" | "embed_save_profile" | "generate_hyde" | "embed_save_hyde", {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        operationMode: import("@langchain/langgraph").BaseChannel<"query" | "write" | "generate", "query" | "write" | "generate" | import("@langchain/langgraph").OverwriteValue<"query" | "write" | "generate">, unknown>;
        forceUpdate: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        prePopulatedProfile: import("@langchain/langgraph").BaseChannel<{
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | undefined, {
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | import("@langchain/langgraph").OverwriteValue<{
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | undefined> | undefined, unknown>;
        objective: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        input: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        profile: import("@langchain/langgraph").BaseChannel<ProfileDocument | undefined, ProfileDocument | import("@langchain/langgraph").OverwriteValue<ProfileDocument | undefined> | undefined, unknown>;
        needsProfileGeneration: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsProfileEmbedding: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsHydeGeneration: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsHydeEmbedding: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsUserInfo: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        missingUserInfo: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        hydeDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        operationsPerformed: import("@langchain/langgraph").BaseChannel<{
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        }, {
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        } | import("@langchain/langgraph").OverwriteValue<{
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        }>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | undefined, {
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | undefined> | undefined, unknown>;
    }, {
        userId: {
            (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
            (): import("@langchain/langgraph").LastValue<string>;
            Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
        };
        operationMode: import("@langchain/langgraph").BaseChannel<"query" | "write" | "generate", "query" | "write" | "generate" | import("@langchain/langgraph").OverwriteValue<"query" | "write" | "generate">, unknown>;
        forceUpdate: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        prePopulatedProfile: import("@langchain/langgraph").BaseChannel<{
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | undefined, {
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | import("@langchain/langgraph").OverwriteValue<{
            identity: {
                name: string;
                bio: string;
                location: string;
            };
            narrative: {
                context: string;
            };
            attributes: {
                skills: string[];
                interests: string[];
            };
        } | undefined> | undefined, unknown>;
        objective: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        input: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        profile: import("@langchain/langgraph").BaseChannel<ProfileDocument | undefined, ProfileDocument | import("@langchain/langgraph").OverwriteValue<ProfileDocument | undefined> | undefined, unknown>;
        needsProfileGeneration: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsProfileEmbedding: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsHydeGeneration: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsHydeEmbedding: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        needsUserInfo: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
        missingUserInfo: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        hydeDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        operationsPerformed: import("@langchain/langgraph").BaseChannel<{
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        }, {
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        } | import("@langchain/langgraph").OverwriteValue<{
            scraped?: boolean;
            generatedProfile?: boolean;
            embeddedProfile?: boolean;
            generatedHyde?: boolean;
            embeddedHyde?: boolean;
        }>, unknown>;
        agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
        readResult: import("@langchain/langgraph").BaseChannel<{
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | undefined, {
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | import("@langchain/langgraph").OverwriteValue<{
            hasProfile: boolean;
            profile?: {
                id?: string;
                name: string;
                bio: string;
                location: string;
                skills: string[];
                interests: string[];
            };
            message?: string;
        } | undefined> | undefined, unknown>;
    }, import("@langchain/langgraph").StateDefinition, {
        check_state: {
            error: string;
            profile?: undefined;
            readResult?: undefined;
            hydeDescription?: undefined;
            needsProfileGeneration?: undefined;
            needsProfileEmbedding?: undefined;
            needsHydeGeneration?: undefined;
            needsHydeEmbedding?: undefined;
            needsUserInfo?: undefined;
            missingUserInfo?: undefined;
        } | {
            profile: any;
            readResult: {
                hasProfile: boolean;
                profile: {
                    id: string | undefined;
                    name: any;
                    bio: any;
                    location: any;
                    skills: any;
                    interests: any;
                };
                message?: undefined;
            } | {
                hasProfile: boolean;
                message: string;
                profile?: undefined;
            };
            error?: undefined;
            hydeDescription?: undefined;
            needsProfileGeneration?: undefined;
            needsProfileEmbedding?: undefined;
            needsHydeGeneration?: undefined;
            needsHydeEmbedding?: undefined;
            needsUserInfo?: undefined;
            missingUserInfo?: undefined;
        } | {
            profile: any;
            hydeDescription: string | undefined;
            needsProfileGeneration: boolean;
            needsProfileEmbedding: any;
            needsHydeGeneration: boolean;
            needsHydeEmbedding: boolean;
            needsUserInfo: boolean;
            missingUserInfo: string[];
            error?: undefined;
            readResult?: undefined;
        } | {
            profile: undefined;
            error: string;
            readResult?: undefined;
            hydeDescription?: undefined;
            needsProfileGeneration?: undefined;
            needsProfileEmbedding?: undefined;
            needsHydeGeneration?: undefined;
            needsHydeEmbedding?: undefined;
            needsUserInfo?: undefined;
            missingUserInfo?: undefined;
        };
        scrape: {
            error?: undefined;
            objective?: undefined;
            input?: undefined;
            operationsPerformed?: undefined;
        } | {
            error: string;
            objective?: undefined;
            input?: undefined;
            operationsPerformed?: undefined;
        } | {
            objective: string;
            input: string;
            operationsPerformed: {
                scraped: boolean;
            };
            error?: undefined;
        };
        auto_generate: {
            error: string;
            prePopulatedProfile?: undefined;
            needsUserInfo?: undefined;
            operationsPerformed?: undefined;
            input?: undefined;
            needsProfileGeneration?: undefined;
        } | {
            prePopulatedProfile: {
                identity: {
                    name: string;
                    bio: string;
                    location: string;
                };
                narrative: {
                    context: string;
                };
                attributes: {
                    skills: string[];
                    interests: string[];
                };
            };
            needsUserInfo: boolean;
            operationsPerformed: {
                scraped: boolean;
            };
            error?: undefined;
            input?: undefined;
            needsProfileGeneration?: undefined;
        } | {
            input: string;
            needsUserInfo: boolean;
            needsProfileGeneration: boolean;
            operationsPerformed: {
                scraped: boolean;
            };
            error?: undefined;
            prePopulatedProfile?: undefined;
        };
        use_prepopulated_profile: {
            error: string;
            profile?: undefined;
            needsHydeGeneration?: undefined;
            operationsPerformed?: undefined;
        } | {
            profile: {
                userId: string;
                embedding: number[] | number[][];
                identity: {
                    name: string;
                    bio: string;
                    location: string;
                };
                narrative: {
                    context: string;
                };
                attributes: {
                    skills: string[];
                    interests: string[];
                };
            };
            needsHydeGeneration: boolean;
            operationsPerformed: {
                generatedProfile: boolean;
            };
            error?: undefined;
        };
        generate_profile: {
            error: string;
            profile?: undefined;
            needsHydeGeneration?: undefined;
            agentTimings?: undefined;
            operationsPerformed?: undefined;
        } | {
            profile: {
                userId: string;
                embedding: number[] | number[][];
                identity: {
                    name: string;
                    bio: string;
                    location: string;
                };
                narrative: {
                    context: string;
                };
                attributes: {
                    interests: string[];
                    skills: string[];
                };
            };
            needsHydeGeneration: boolean;
            agentTimings: DebugMetaAgent[];
            operationsPerformed: {
                generatedProfile: boolean;
            };
            error?: undefined;
        } | {
            error: string;
            agentTimings: DebugMetaAgent[];
            profile?: undefined;
            needsHydeGeneration?: undefined;
            operationsPerformed?: undefined;
        };
        embed_save_profile: {
            error: string;
            profile?: undefined;
            operationsPerformed?: undefined;
        } | {
            profile: {
                identity: {
                    name: string;
                    bio: string;
                    location: string;
                };
                narrative: {
                    context: string;
                };
                attributes: {
                    interests: string[];
                    skills: string[];
                };
                userId: string;
                embedding: number[] | number[][] | null;
            };
            operationsPerformed: {
                embeddedProfile: boolean;
            };
            error?: undefined;
        };
        generate_hyde: {
            error: string;
            hydeDescription?: undefined;
            agentTimings?: undefined;
            operationsPerformed?: undefined;
        } | {
            hydeDescription: string;
            agentTimings: DebugMetaAgent[];
            operationsPerformed: {
                generatedHyde: boolean;
            };
            error?: undefined;
        };
        embed_save_hyde: {
            error: string;
            operationsPerformed?: undefined;
        } | {
            operationsPerformed: {
                embeddedHyde: boolean;
            };
            error?: undefined;
        };
    }, unknown, unknown>;
}
//# sourceMappingURL=profile.graph.d.ts.map