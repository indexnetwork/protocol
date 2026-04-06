import type { ToolDeps, ToolRegistry } from './tool.helpers';
/**
 * Creates a tool registry containing all tool handlers indexed by name.
 * Handlers are raw async functions (not LangChain tool() wrappers) that
 * accept { context, query } and return a JSON string.
 *
 * @param deps - Shared tool dependencies (graphs, database, embedder, etc.)
 * @param context - Resolved user context for this request.
 * @returns Map of tool name to raw tool definition.
 */
export declare function createToolRegistry(deps: ToolDeps): ToolRegistry;
//# sourceMappingURL=tool.registry.d.ts.map