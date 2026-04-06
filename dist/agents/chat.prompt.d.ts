import type { ResolvedToolContext } from "../tools/index.js";
import type { IterationContext } from "./chat.prompt.modules.js";
/**
 * Nudge message injected after SOFT_ITERATION_LIMIT iterations.
 */
export declare const ITERATION_NUDGE = "[System Note: You've made several tool calls. Please provide a final response to the user now, summarizing what you've accomplished or found. If you need more information from the user, ask for it in your response.]";
/**
 * Builds the full system prompt for the chat agent.
 * Composes core, onboarding, scoping, and dynamic modules into a single
 * prompt string. Without iterCtx only core sections are included; modules
 * are omitted, producing a leaner first-iteration prompt.
 *
 * @param ctx - Resolved tool context for the current session
 * @param iterCtx - Optional iteration context for dynamic module resolution
 * @returns The complete system prompt string
 */
export declare function buildSystemContent(ctx: ResolvedToolContext, iterCtx?: IterationContext): string;
//# sourceMappingURL=chat.prompt.d.ts.map