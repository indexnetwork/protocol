import { z } from "zod";
import type { ModelConfig } from "../agents/model.config.js";
import type { ProfileDocument } from "../agents/profile.generator.js";
import type { ChatGraphCompositeDatabase, IndexMembership, UserRecord, UserDatabase, SystemDatabase, NegotiationDatabase } from "../interfaces/database.interface.js";
import type { Scraper } from "../interfaces/scraper.interface.js";
import type { Cache, HydeCache } from "../interfaces/cache.interface.js";
import type { CompiledOpportunityGraph } from "../support/opportunity.discover.js";
import type { IntegrationAdapter } from "../interfaces/integration.interface.js";
import type { ContactServiceAdapter } from "../interfaces/contact.interface.js";
import type { ProfileEnricher } from "../interfaces/enrichment.interface.js";
import type { IntentGraphQueue } from "../interfaces/queue.interface.js";
import type { ChatSessionReader } from "../interfaces/chat-session.interface.js";
import type { Embedder } from "../interfaces/embedder.interface.js";
/** Profile without embedding — used in resolved context to avoid bloating prompts and memory. */
export type ProfileContext = Omit<ProfileDocument, "embedding"> | null;
/** Minimal interface for an invokable compiled LangGraph. */
export type CompiledGraph = {
    invoke: (input: any) => Promise<any>;
};
/**
 * Resolved context available to every tool handler.
 * Contains the current user and optional index identity, resolved from DB at init.
 * The LLM can see this context (via system prompt) but cannot change it.
 */
export interface ResolvedToolContext {
    userId: string;
    userName: string;
    userEmail: string;
    indexId?: string;
    indexName?: string;
    /** True when chat is index-scoped and the user owns the index. */
    isOwner?: boolean;
    user: UserRecord;
    userProfile: ProfileContext;
    userIndexes: IndexMembership[];
    scopedIndex?: {
        id: string;
        title: string;
        prompt: string | null;
    };
    scopedMembershipRole?: "owner" | "member";
    /** True when user has not completed onboarding (onboarding.completedAt is null). */
    isOnboarding: boolean;
    /** True when the user has a non-empty name. */
    hasName: boolean;
    /** Chat session ID when tools are used in a chat; used for draft opportunities (context.conversationId). */
    sessionId?: string;
}
/**
 * Dependencies passed when creating tools for a user session.
 * Includes DB adapters, embedder, and scraper.
 *
 * Note: userDb and systemDb are optional inputs - if not provided, createChatTools
 * will create them internally from the chatDatabaseAdapter singleton.
 */
export interface ToolContext {
    userId: string;
    /** @deprecated Use userDb or systemDb instead. Kept for backwards compatibility. */
    database: ChatGraphCompositeDatabase;
    /** Context-bound database for accessing the authenticated user's own resources. Created internally if not provided. */
    userDb?: UserDatabase;
    /** Context-bound database for LLM/system operations on cross-user resources within shared indexes. Created internally if not provided. */
    systemDb?: SystemDatabase;
    embedder: Embedder;
    scraper: Scraper;
    /** When set, chat is scoped to this index; tools use it as default for read_intents and create_intent. */
    indexId?: string;
    /** Chat session ID when creating tools for a chat; enables draft opportunities with context.conversationId. */
    sessionId?: string;
    /** General-purpose cache (e.g. for tool results). */
    cache: Cache;
    /** Dedicated cache for HyDE graph (may be same instance as cache). */
    hydeCache: HydeCache;
    /** External integration platform adapter (OAuth, tool actions). */
    integration: IntegrationAdapter;
    /** Queue for enqueuing follow-up intent processing (HyDE generation/deletion). */
    intentQueue: IntentGraphQueue;
    /** Contact management operations. */
    contactService: ContactServiceAdapter;
    /** Chat session reader for loading conversation history. */
    chatSession: ChatSessionReader;
    /** Profile enrichment from external data sources. */
    enricher: ProfileEnricher;
    /** Database adapter for negotiation/conversation operations. */
    negotiationDatabase: NegotiationDatabase;
    /** Integration importer for bulk contact import from toolkits. */
    integrationImporter: {
        importContacts(userId: string, toolkit: string): Promise<{
            imported: number;
            skipped: number;
            newContacts: number;
            existingContacts: number;
        }>;
    };
    /** Factory for user-scoped database access. */
    createUserDatabase: (db: ChatGraphCompositeDatabase, userId: string) => UserDatabase;
    /** Factory for system-scoped database access. */
    createSystemDatabase: (db: ChatGraphCompositeDatabase, userId: string, indexScope: string[], embedder?: Embedder) => SystemDatabase;
    /** Optional runtime LLM config. Pass to override env vars for API key, model, etc. */
    modelConfig?: ModelConfig;
}
/**
 * All external dependencies needed to initialize the protocol tool engine.
 * The host application (composition root) must provide concrete implementations.
 * This is the subset of ToolContext that is NOT per-request (no userId, indexId, sessionId).
 */
export type ProtocolDeps = Omit<ToolContext, 'userId' | 'indexId' | 'sessionId' | 'userDb' | 'systemDb'>;
/**
 * Thrown when a requested chat scope is invalid for the authenticated user.
 * Controllers can map this to an HTTP status code.
 */
export declare class ChatContextAccessError extends Error {
    readonly statusCode: number;
    readonly code: "USER_NOT_FOUND" | "INDEX_NOT_FOUND" | "INDEX_MEMBERSHIP_REQUIRED";
    constructor(message: string, statusCode: number, code: "USER_NOT_FOUND" | "INDEX_NOT_FOUND" | "INDEX_MEMBERSHIP_REQUIRED");
}
/**
 * Resolve the canonical context used by chat tools and system prompt.
 * This preloads user identity, profile, index memberships, and scoped index role.
 */
export declare function resolveChatContext(params: {
    database: Pick<ChatGraphCompositeDatabase, "getUser" | "getProfile" | "getIndexMemberships" | "getIndexMembership" | "getIndex" | "isIndexOwner" | "isIndexMember">;
    userId: string;
    indexId?: string;
    /** Chat session ID for draft opportunities (stored as context.conversationId). */
    sessionId?: string;
}): Promise<ResolvedToolContext>;
/**
 * Type for the `defineTool` closure created in `createChatTools`.
 * Auto-injects resolved context and provides uniform logging / error handling.
 */
export type DefineTool = <T extends z.ZodType>(opts: {
    name: string;
    description: string;
    querySchema: T;
    handler: (input: {
        context: ResolvedToolContext;
        query: z.infer<T>;
    }) => Promise<string>;
}) => any;
/**
 * A raw tool definition before LangChain wrapping.
 * Used by the tool registry for direct HTTP invocation.
 */
export interface RawToolDefinition {
    name: string;
    description: string;
    schema: z.ZodType;
    handler: (input: {
        context: ResolvedToolContext;
        query: unknown;
    }) => Promise<string>;
}
/**
 * Registry mapping tool names to their raw definitions.
 */
export type ToolRegistry = Map<string, RawToolDefinition>;
/**
 * Shared dependencies available to all tool domain factories.
 * Passed by `createChatTools` after compiling all subgraphs.
 */
export interface ToolDeps {
    /** @deprecated Use userDb or systemDb instead. Kept for backwards compatibility. */
    database: ChatGraphCompositeDatabase;
    /** Context-bound database for accessing the authenticated user's own resources. */
    userDb: UserDatabase;
    /** Context-bound database for LLM/system operations on cross-user resources within shared indexes. */
    systemDb: SystemDatabase;
    scraper: Scraper;
    embedder: import('../interfaces/embedder.interface.js').Embedder;
    cache: Cache;
    integration: IntegrationAdapter;
    contactService: ContactServiceAdapter;
    integrationImporter: {
        importContacts(userId: string, toolkit: string): Promise<{
            imported: number;
            skipped: number;
            newContacts: number;
            existingContacts: number;
        }>;
    };
    enricher: ProfileEnricher;
    graphs: {
        profile: CompiledGraph;
        intent: CompiledGraph;
        index: CompiledGraph;
        indexMembership: CompiledGraph;
        intentIndex: CompiledGraph;
        opportunity: CompiledOpportunityGraph;
    };
}
export declare function success<T>(data: T): string;
export declare function error(message: string, debugSteps?: Array<{
    step: string;
    detail?: string;
    data?: Record<string, unknown>;
}>): string;
/** Return needsClarification for missing required fields. */
export declare function needsClarification(params: {
    missingFields: string[];
    message: string;
}): string;
/** UUID v4 format: 8-4-4-4-12 hex chars (e.g. c2505011-2e45-426e-81dd-b9abb9b72023) */
export declare const UUID_REGEX: RegExp;
/**
 * Resolves an array of index IDs to their display titles.
 * Skips any IDs that don't resolve (deleted or invalid indexes).
 */
export declare function resolveIndexNames(database: {
    getIndex(id: string): Promise<{
        id: string;
        title: string;
    } | null>;
}, indexIds: string[]): Promise<string[]>;
/**
 * Normalize a URL string: if it lacks a protocol, prepend "https://".
 * Returns the normalized URL or null if the result is not a valid URL.
 */
export declare function normalizeUrl(raw: string): string | null;
/**
 * Extract unique, valid URLs from a string (e.g. user message or details).
 * Handles both full URLs (https://...) and bare domains (github.com/...).
 */
export declare function extractUrls(text: string): string[];
//# sourceMappingURL=tool.helpers.d.ts.map