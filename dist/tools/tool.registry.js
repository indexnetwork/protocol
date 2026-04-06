import { createProfileTools } from './profile.tools.js';
import { createIntentTools } from './intent.tools.js';
import { createIndexTools } from './index.tools.js';
import { createOpportunityTools } from './opportunity.tools.js';
import { createUtilityTools } from './utility.tools.js';
import { createIntegrationTools } from './integration.tools.js';
import { createContactTools } from './contact.tools.js';
import { protocolLogger } from '../support/protocol.logger.js';
import { error } from './tool.helpers.js';
const logger = protocolLogger('ToolRegistry');
/**
 * Creates a tool registry containing all tool handlers indexed by name.
 * Handlers are raw async functions (not LangChain tool() wrappers) that
 * accept { context, query } and return a JSON string.
 *
 * @param deps - Shared tool dependencies (graphs, database, embedder, etc.)
 * @param context - Resolved user context for this request.
 * @returns Map of tool name to raw tool definition.
 */
export function createToolRegistry(deps) {
    const registry = new Map();
    // defineTool that captures raw handlers into the registry
    function defineTool(opts) {
        const entry = {
            name: opts.name,
            description: opts.description,
            schema: opts.querySchema,
            handler: async (input) => {
                logger.verbose(`Tool: ${opts.name}`, {
                    context: { userId: input.context.userId, indexId: input.context.indexId },
                    query: input.query,
                });
                try {
                    return await opts.handler({ context: input.context, query: input.query });
                }
                catch (err) {
                    logger.error(`${opts.name} failed`, {
                        error: err instanceof Error ? err.message : String(err),
                    });
                    return error(`Failed to execute ${opts.name}: ${err instanceof Error ? err.message : String(err)}`);
                }
            },
        };
        registry.set(opts.name, entry);
        // Return a dummy — create*Tools functions collect return values into arrays,
        // but for the registry path we only need the side-effect on the Map.
        return null;
    }
    // Create all tool domains -- each one calls defineTool() which populates the registry.
    // The local defineTool is compatible with DefineTool (which returns any).
    const dt = defineTool;
    createProfileTools(dt, deps);
    createIntentTools(dt, deps);
    createIndexTools(dt, deps);
    createOpportunityTools(dt, deps);
    createUtilityTools(dt, deps);
    createIntegrationTools(dt, deps);
    createContactTools(dt, deps);
    logger.verbose(`Tool registry created with ${registry.size} tools`);
    return registry;
}
//# sourceMappingURL=tool.registry.js.map