import { ProfileDocument } from "../agents/profile.generator";
import type { DebugMetaAgent } from '../types/chat-streaming.types';
/**
 * The Graph State for Profile Generation.
 */
export declare const ProfileGraphState: import("@langchain/langgraph").AnnotationRoot<{
    /**
     * The User ID to link the profile to.
     */
    userId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /**
     * Operation mode controls graph flow:
     * - 'query': Fast path - only retrieve existing profile (no generation)
     * - 'write': Full pipeline - generate/update profile and hyde as needed
     * - 'generate': Auto-generate profile from user table data via enrichUserProfile Chat API
     */
    operationMode: import("@langchain/langgraph").BaseChannel<"query" | "write" | "generate", "query" | "write" | "generate" | import("@langchain/langgraph").OverwriteValue<"query" | "write" | "generate">, unknown>;
    /**
     * Flag to force profile regeneration even if profile exists.
     * When true with new input, the graph will re-generate and update the profile.
     */
    forceUpdate: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /**
     * Pre-populated profile from external enrichment (e.g. Parallel Chat API).
     * When provided, the graph skips profile generation and only runs embedding + HyDE.
     */
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
    /**
     * Internal objective constructed from user data.
     */
    objective: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Raw input data (either provided or scraped).
     */
    input: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * The generated or loaded profile document.
     * Includes embedding from DB. Profile HyDE is stored in hyde_documents.
     */
    profile: import("@langchain/langgraph").BaseChannel<ProfileDocument | undefined, ProfileDocument | import("@langchain/langgraph").OverwriteValue<ProfileDocument | undefined> | undefined, unknown>;
    /**
     * Flags to track what needs to be generated.
     */
    needsProfileGeneration: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    needsProfileEmbedding: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    needsHydeGeneration: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    needsHydeEmbedding: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /**
     * Flag indicating that user information is insufficient for accurate profile generation.
     * When true, the graph should request additional information from the user.
     */
    needsUserInfo: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /**
     * List of missing user information fields.
     * Used to construct a helpful clarification message.
     */
    missingUserInfo: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    /**
     * The generated HyDE description string from the HydeGenerator.
     */
    hydeDescription: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Error message if any step fails (non-fatal).
     */
    error: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /**
     * Tracks which operations were actually performed during this graph execution.
     * Used to provide explicit feedback to the user about what happened.
     */
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
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
    /**
     * Output for query mode: structured result for the tool to read.
     */
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
}>;
//# sourceMappingURL=profile.state.d.ts.map