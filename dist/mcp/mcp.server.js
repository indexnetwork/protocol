/**
 * MCP Server Factory — creates an McpServer instance with all protocol tools
 * registered from the existing tool registry. Each tool invocation resolves
 * auth from the HTTP request, builds a ResolvedToolContext, and delegates
 * to the raw tool handler.
 */
import { z } from 'zod';
import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import { resolveChatContext } from '../tools/tool.helpers.js';
import { createToolRegistry } from '../tools/tool.registry.js';
import { protocolLogger } from '../support/protocol.logger.js';
const logger = protocolLogger('McpServer');
// ═══════════════════════════════════════════════════════════════════════════════
// ZOD 3 → JSON SCHEMA CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Minimal Zod-to-JSON-Schema conversion for MCP tool registration.
 * Converts Zod 3.x schemas to plain JSON Schema objects that can be
 * wrapped with `fromJsonSchema()` for MCP SDK compatibility.
 */
function zodToJsonSchema(schema) {
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            const zodValue = value;
            properties[key] = zodToJsonSchema(zodValue);
            if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodDefault)) {
                required.push(key);
            }
        }
        return { type: 'object', properties, ...(required.length ? { required } : {}) };
    }
    if (schema instanceof z.ZodString) {
        const result = { type: 'string' };
        // Detect .url(), .email(), .uuid() etc. via Zod's internal checks array
        const checks = schema._def?.checks;
        if (checks) {
            for (const check of checks) {
                if (check.kind === 'url')
                    result.format = 'uri';
                else if (check.kind === 'email')
                    result.format = 'email';
                else if (check.kind === 'uuid')
                    result.format = 'uuid';
                else if (check.kind === 'datetime')
                    result.format = 'date-time';
            }
        }
        return result;
    }
    if (schema instanceof z.ZodNumber) {
        const checks = schema._def?.checks;
        const result = { type: 'number' };
        if (checks) {
            for (const check of checks) {
                if (check.kind === 'int')
                    result.type = 'integer';
                else if (check.kind === 'min')
                    result.minimum = check.value;
                else if (check.kind === 'max')
                    result.maximum = check.value;
            }
        }
        return result;
    }
    if (schema instanceof z.ZodBoolean)
        return { type: 'boolean' };
    if (schema instanceof z.ZodArray) {
        return { type: 'array', items: zodToJsonSchema(schema.element) };
    }
    if (schema instanceof z.ZodOptional) {
        return zodToJsonSchema(schema.unwrap());
    }
    if (schema instanceof z.ZodDefault) {
        return zodToJsonSchema(schema.removeDefault());
    }
    if (schema instanceof z.ZodEnum) {
        return { type: 'string', enum: schema.options };
    }
    if (schema instanceof z.ZodNullable) {
        const inner = zodToJsonSchema(schema.unwrap());
        return { ...inner, nullable: true };
    }
    if (schema instanceof z.ZodRecord) {
        return { type: 'object', additionalProperties: true };
    }
    return { type: 'object' };
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
export function createMcpServer(deps, authResolver, scopedDepsFactory) {
    const server = new McpServer({
        name: 'index-network',
        version: '1.0.0',
    });
    const registry = createToolRegistry(deps);
    for (const [toolName, toolDef] of registry) {
        // Convert Zod 3 schema to JSON Schema, then wrap with fromJsonSchema
        // for MCP SDK's StandardSchemaWithJSON compatibility
        const jsonSchema = zodToJsonSchema(toolDef.schema);
        const mcpSchema = fromJsonSchema(jsonSchema);
        server.registerTool(toolName, {
            description: toolDef.description,
            inputSchema: mcpSchema,
        }, async (args, ctx) => {
            try {
                // Extract the original HTTP request from the MCP server context
                const httpReq = ctx.http?.req;
                if (!httpReq) {
                    return {
                        content: [{ type: 'text', text: JSON.stringify({ error: 'No HTTP request available in MCP context' }) }],
                        isError: true,
                    };
                }
                // Resolve authenticated user
                const userId = await authResolver.resolveUserId(httpReq);
                // Resolve chat context for the user
                const context = await resolveChatContext({ database: deps.database, userId });
                // Build per-request scoped databases via injected factory
                const indexScope = context.userIndexes.map((m) => m.indexId);
                const scopedDbs = scopedDepsFactory.create(userId, indexScope);
                // Override deps with per-request scoped databases
                const requestDeps = { ...deps, ...scopedDbs };
                // Re-create registry with per-request deps for scoped database access
                const requestRegistry = createToolRegistry(requestDeps);
                const requestTool = requestRegistry.get(toolName);
                if (!requestTool) {
                    return {
                        content: [{ type: 'text', text: JSON.stringify({ error: `Tool "${toolName}" not found` }) }],
                        isError: true,
                    };
                }
                // Validate input against the original Zod schema
                const parseResult = toolDef.schema.safeParse(args);
                if (!parseResult.success) {
                    const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
                    return {
                        content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid input: ${issues}` }) }],
                        isError: true,
                    };
                }
                const validatedArgs = parseResult.data;
                // Execute the tool handler
                const result = await requestTool.handler({ context, query: validatedArgs });
                return {
                    content: [{ type: 'text', text: result }],
                };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`MCP tool "${toolName}" failed`, { error: message });
                return {
                    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
                    isError: true,
                };
            }
        });
    }
    logger.verbose(`MCP server created with ${registry.size} tools`);
    return server;
}
//# sourceMappingURL=mcp.server.js.map