import { type ToolContext, type ResolvedToolContext } from "./tool.helpers.js";
export type { ToolContext, ResolvedToolContext, ProtocolDeps } from "./tool.helpers.js";
export type { ToolDeps } from "./tool.helpers.js";
/**
 * Creates all chat tools bound to a specific user context.
 * Resolves user/index identity from DB at init time.
 * Tools are created fresh for each user session to ensure proper isolation.
 *
 * All external dependencies (cache, integration, queue, etc.) are provided
 * via the `deps` parameter — the protocol lib never imports concrete adapters.
 */
export declare function createChatTools(deps: ToolContext, preResolvedContext?: ResolvedToolContext): Promise<any[]>;
/**
 * Type for the tools array returned by createChatTools.
 */
export type ChatTools = Awaited<ReturnType<typeof createChatTools>>;
//# sourceMappingURL=index.d.ts.map