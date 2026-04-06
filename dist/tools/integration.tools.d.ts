import type { DefineTool, ToolDeps } from './tool.helpers.js';
/**
 * Creates integration tools for the chat agent.
 *
 * Exposes `import_gmail_contacts` which authenticates via the integration adapter,
 * fetches all Gmail contacts (paginated), and imports them as ghost users into the network.
 *
 * @param defineTool - Tool definition helper injected by the tool registry.
 * @param deps - Shared tool dependencies including the integration adapter.
 * @returns An array of tool definitions to register with the chat agent.
 */
export declare function createIntegrationTools(defineTool: DefineTool, deps: ToolDeps): any[];
//# sourceMappingURL=integration.tools.d.ts.map