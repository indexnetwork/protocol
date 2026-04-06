/**
 * MCP Server Factory — creates an McpServer instance with all protocol tools
 * registered from the existing tool registry. Each tool invocation resolves
 * auth from the HTTP request, builds a ResolvedToolContext, and delegates
 * to the raw tool handler.
 */
import { McpServer } from '@modelcontextprotocol/server';
import type { McpAuthResolver } from '../interfaces/auth.interface';
import type { ToolDeps } from '../tools/tool.helpers';
/**
 * Factory for creating per-request scoped database instances.
 * Injected from the controller/handler layer to keep the protocol layer
 * free of direct adapter imports.
 */
export interface ScopedDepsFactory {
    /** Creates scoped userDb and systemDb for the given user and index scope. */
    create(userId: string, indexScope: string[]): Pick<ToolDeps, 'userDb' | 'systemDb'>;
}
/**
 * Creates an MCP server with all protocol tools registered.
 * Tools resolve auth per-request via the HTTP request available in ServerContext.
 *
 * @param deps - Shared tool dependencies (graphs, database, embedder, etc.)
 * @param authResolver - Resolves authenticated user ID from the HTTP request
 * @param scopedDepsFactory - Factory for creating per-request scoped databases
 * @returns A configured McpServer ready to be connected to a transport
 */
export declare function createMcpServer(deps: ToolDeps, authResolver: McpAuthResolver, scopedDepsFactory: ScopedDepsFactory): McpServer;
//# sourceMappingURL=mcp.server.d.ts.map