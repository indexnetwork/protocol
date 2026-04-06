import type { BaseMessage } from "@langchain/core/messages";
import type { ResolvedToolContext } from "../tools";
/**
 * A conditional prompt section injected into the system prompt based on triggers.
 */
export interface PromptModule {
    /** Unique module identifier. */
    id: string;
    /** Tool names that activate this module. */
    triggers: string[];
    /** Module IDs to suppress when this module activates (unidirectional). */
    excludes?: string[];
    /** Optional filter applied after tool trigger match. Return false to skip despite trigger match. */
    triggerFilter?: (iterCtx: IterationContext) => boolean;
    /** User message pattern that activates this module (secondary trigger). */
    regex?: RegExp;
    /** Returns the prompt text to inject. */
    content: (ctx: ResolvedToolContext) => string;
}
/**
 * State available to module resolution at each iteration.
 */
export interface IterationContext {
    /** Tool calls from all iterations since the last user message. */
    recentTools: Array<{
        name: string;
        args: Record<string, unknown>;
    }>;
    /** Text of the latest user message (for regex matching). */
    currentMessage?: string;
    /** Resolved tool context (user, profile, indexes, etc.). */
    ctx: ResolvedToolContext;
}
/**
 * Extracts tool calls from all AI messages since the last HumanMessage.
 *
 * Scans backwards to find the last HumanMessage, then collects all tool calls
 * from AIMessages after that point. This ensures multi-iteration tool history
 * is available for module resolution within a single user turn.
 *
 * @param messages - The current conversation message array
 * @returns Flattened array of tool name + args from the current agent turn
 */
export declare function extractRecentToolCalls(messages: BaseMessage[]): Array<{
    name: string;
    args: Record<string, unknown>;
}>;
/** All registered prompt modules. */
export declare const PROMPT_MODULES: PromptModule[];
/**
 * Resolves which prompt modules should be injected for the current iteration.
 *
 * Phase 1: Skip all modules when onboarding is active (early exit).
 * Phase 2: Collect candidate modules by checking triggers and regex.
 * Phase 3: Apply exclusions (unidirectional — the excluding module stays).
 *
 * @param iterCtx - Current iteration context (tool history, user message, resolved context)
 * @returns Concatenated prompt text from all matched modules
 */
export declare function resolveModules(iterCtx: IterationContext): string;
//# sourceMappingURL=chat.prompt.modules.d.ts.map