import type { DebugMetaAgent } from '../types/chat-streaming.types';
/**
 * Intent payload and metadata loaded for index evaluation.
 * (Migrated from the old index.graph.state.ts)
 */
export interface IntentForIndexing {
    id: string;
    payload: string;
    userId: string;
    sourceType: string | null;
    sourceId: string | null;
}
/**
 * Index and member prompts for a single index (user must be member with autoAssign).
 * (Migrated from the old index.graph.state.ts)
 */
export interface IndexMemberContext {
    indexId: string;
    indexPrompt: string | null;
    memberPrompt: string | null;
}
/**
 * Result of executing an assignment decision.
 * (Migrated from the old index.graph.state.ts)
 */
export interface AssignmentResult {
    indexId: string;
    assigned: boolean;
    success: boolean;
    error?: string;
}
/**
 * Intent Index Graph State.
 * Handles CRUD for the intent_indexes junction table (linking intents to indexes).
 * Absorbs the old Index Graph's evaluate-based assignment flow.
 *
 * Flow:
 * START → router → {
 *   create: assignNode (direct or evaluated) → END
 *   read: readNode → END
 *   delete: unassignNode → END
 * }
 */
export declare const IntentIndexGraphState: import("@langchain/langgraph").AnnotationRoot<{
    /** User performing the action. Always required. */
    userId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    /** Target index for assign/read-by-index. From ChatGraph or tool arg. */
    indexId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Target intent for assign/read-by-intent. From tool arg. */
    intentId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Operation mode. */
    operationMode: import("@langchain/langgraph").BaseChannel<"create" | "delete" | "read", "create" | "delete" | "read" | import("@langchain/langgraph").OverwriteValue<"create" | "delete" | "read">, unknown>;
    /**
     * When true, skip LLM evaluation and assign directly.
     * (Migrated from old Index Graph.)
     */
    skipEvaluation: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    /** Intent payload and metadata. Null if intent not found. */
    intent: import("@langchain/langgraph").BaseChannel<IntentForIndexing | null, IntentForIndexing | import("@langchain/langgraph").OverwriteValue<IntentForIndexing | null> | null, unknown>;
    /** Index + member context. Null if user not eligible. */
    indexContext: import("@langchain/langgraph").BaseChannel<IndexMemberContext | null, IndexMemberContext | import("@langchain/langgraph").OverwriteValue<IndexMemberContext | null> | null, unknown>;
    /** LLM evaluation result. Null if skipped. */
    evaluation: import("@langchain/langgraph").BaseChannel<{
        reasoning: string;
        indexScore: number;
        memberScore: number;
    } | null, {
        reasoning: string;
        indexScore: number;
        memberScore: number;
    } | import("@langchain/langgraph").OverwriteValue<{
        reasoning: string;
        indexScore: number;
        memberScore: number;
    } | null> | null, unknown>;
    /** Final decision: should intent be in this index? */
    shouldAssign: import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
    /** Final score used for decision (0–1). */
    finalScore: import("@langchain/langgraph").BaseChannel<number | undefined, number | import("@langchain/langgraph").OverwriteValue<number | undefined> | undefined, unknown>;
    /** Result of the assignment operation. */
    assignmentResult: import("@langchain/langgraph").BaseChannel<AssignmentResult | null, AssignmentResult | import("@langchain/langgraph").OverwriteValue<AssignmentResult | null> | null, unknown>;
    /** For read-by-intent: pass userId when listing an intent's indexes (omit for read-by-index). */
    queryUserId: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    /** Output for read mode. */
    readResult: import("@langchain/langgraph").BaseChannel<{
        links: Array<{
            intentId: string;
            indexId: string;
            intentTitle?: string;
            indexTitle?: string;
            userId?: string;
            userName?: string;
            createdAt?: Date;
        }>;
        count: number;
        mode: string;
        note?: string;
    } | undefined, {
        links: Array<{
            intentId: string;
            indexId: string;
            intentTitle?: string;
            indexTitle?: string;
            userId?: string;
            userName?: string;
            createdAt?: Date;
        }>;
        count: number;
        mode: string;
        note?: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        links: Array<{
            intentId: string;
            indexId: string;
            intentTitle?: string;
            indexTitle?: string;
            userId?: string;
            userName?: string;
            createdAt?: Date;
        }>;
        count: number;
        mode: string;
        note?: string;
    } | undefined> | undefined, unknown>;
    /** Output for create/delete modes. */
    mutationResult: import("@langchain/langgraph").BaseChannel<{
        success: boolean;
        message?: string;
        error?: string;
    } | undefined, {
        success: boolean;
        message?: string;
        error?: string;
    } | import("@langchain/langgraph").OverwriteValue<{
        success: boolean;
        message?: string;
        error?: string;
    } | undefined> | undefined, unknown>;
    /** Error message. */
    error: import("@langchain/langgraph").BaseChannel<string | null, string | import("@langchain/langgraph").OverwriteValue<string | null> | null, unknown>;
    /** Timing records for each agent invocation within this graph run. */
    agentTimings: import("@langchain/langgraph").BaseChannel<DebugMetaAgent[], DebugMetaAgent[] | import("@langchain/langgraph").OverwriteValue<DebugMetaAgent[]>, unknown>;
}>;
//# sourceMappingURL=intent_index.state.d.ts.map