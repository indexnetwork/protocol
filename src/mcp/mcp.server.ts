/**
 * MCP Server Factory — creates an McpServer instance with all protocol tools
 * registered from the existing tool registry. Each tool invocation resolves
 * auth from the HTTP request, builds a ResolvedToolContext, and delegates
 * to the raw tool handler.
 */

import { z } from 'zod';
import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import type { ServerContext, JsonSchemaType } from '@modelcontextprotocol/server';

import type { McpAuthResolver } from '../shared/interfaces/auth.interface.js';
import type { ToolDeps } from '../shared/agent/tool.helpers.js';
import { resolveChatContext } from '../shared/agent/tool.helpers.js';
import { createToolRegistry } from '../shared/agent/tool.registry.js';
import { protocolLogger } from '../shared/observability/protocol.logger.js';

const logger = protocolLogger('McpServer');

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD 3 → JSON SCHEMA CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimal Zod-to-JSON-Schema conversion for MCP tool registration.
 * Converts Zod 3.x schemas to plain JSON Schema objects that can be
 * wrapped with `fromJsonSchema()` for MCP SDK compatibility.
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType;
      properties[key] = zodToJsonSchema(zodValue);
      if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodDefault)) {
        required.push(key);
      }
    }
    return { type: 'object', properties, ...(required.length ? { required } : {}) };
  }
  if (schema instanceof z.ZodString) {
    const result: Record<string, unknown> = { type: 'string' };
    // Detect .url(), .email(), .uuid() etc. via Zod's internal checks array
    const checks = (schema as z.ZodString & { _def: { checks: Array<{ kind: string }> } })._def?.checks;
    if (checks) {
      for (const check of checks) {
        if (check.kind === 'url') result.format = 'uri';
        else if (check.kind === 'email') result.format = 'email';
        else if (check.kind === 'uuid') result.format = 'uuid';
        else if (check.kind === 'datetime') result.format = 'date-time';
      }
    }
    return result;
  }
  if (schema instanceof z.ZodNumber) {
    const checks = (schema as z.ZodNumber & { _def: { checks: Array<{ kind: string; value?: number }> } })._def?.checks;
    const result: Record<string, unknown> = { type: 'number' };
    if (checks) {
      for (const check of checks) {
        if (check.kind === 'int') result.type = 'integer';
        else if (check.kind === 'min') result.minimum = check.value;
        else if (check.kind === 'max') result.maximum = check.value;
      }
    }
    return result;
  }
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToJsonSchema((schema as z.ZodArray<z.ZodType>).element) };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema((schema as z.ZodOptional<z.ZodType>).unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return zodToJsonSchema((schema as z.ZodDefault<z.ZodType>).removeDefault());
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: (schema as z.ZodEnum<[string, ...string[]]>).options };
  }
  if (schema instanceof z.ZodNullable) {
    const inner = zodToJsonSchema((schema as z.ZodNullable<z.ZodType>).unwrap());
    return { ...inner, nullable: true };
  }
  if (schema instanceof z.ZodRecord) {
    return { type: 'object', additionalProperties: true };
  }
  return { type: 'object' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP SERVER FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

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
 * @param authResolver - Resolves authenticated identity from the HTTP request
 * @param scopedDepsFactory - Factory for creating per-request scoped databases
 * @returns A configured McpServer ready to be connected to a transport
 */
export function createMcpServer(
  deps: ToolDeps,
  authResolver: McpAuthResolver,
  scopedDepsFactory: ScopedDepsFactory,
): McpServer {
  const INSTACLAW_SETUP = `
Index Network MCP gives you tools to manage intents, networks, contacts, negotiations, and agents on behalf of the user.

---

If you are an OpenClaw agent running on an InstaClaw VM, complete the following setup before using any Index tools:

1. Download the webhook relay binary:
   curl -L https://github.com/indexnetwork/index/releases/latest/download/index-webhook-x86_64-unknown-linux-musl -o /usr/local/bin/index-webhook
   chmod +x /usr/local/bin/index-webhook

2. Generate a webhook secret and write the env file:
   SECRET=$(openssl rand -hex 32)
   printf "INDEX_WEBHOOK_SECRET=$SECRET\\nPORT=3000\\n" | sudo tee /etc/index-webhook.env

3. Write the systemd unit:
   sudo tee /etc/systemd/system/index-webhook.service << 'EOF'
   [Unit]
   Description=Index Network webhook relay for OpenClaw
   After=network.target

   [Service]
   EnvironmentFile=/etc/index-webhook.env
   ExecStart=/usr/local/bin/index-webhook
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   EOF

4. Enable and start the service:
   sudo systemctl daemon-reload
   sudo systemctl enable --now index-webhook
   sudo systemctl status index-webhook

5. Get your public IPv6 address:
   curl -6 ifconfig.me
   # Example output: 2600:3c03::2000:29ff:feb8:d613

6. Register yourself as an agent — call register_agent with:
   - name: "OpenClaw Agent"
   - channel: "webhook"
   - url: "http://[<your-ipv6-from-step-5>]:3000/index/webhook"
   - secret: <re-read with: sudo grep INDEX_WEBHOOK_SECRET /etc/index-webhook.env | cut -d= -f2>
   - actions: ["manage:negotiations"]

Setup complete. You can now receive negotiation events from Index Network.
`.trim();

  const server = new McpServer(
    { name: 'index-network', version: '1.0.0' },
    { instructions: INSTACLAW_SETUP },
  );

  const registry = createToolRegistry(deps);

  for (const [toolName, toolDef] of registry) {
    // Convert Zod 3 schema to JSON Schema, then wrap with fromJsonSchema
    // for MCP SDK's StandardSchemaWithJSON compatibility
    const jsonSchema = zodToJsonSchema(toolDef.schema) as JsonSchemaType;
    const mcpSchema = fromJsonSchema(jsonSchema);

    server.registerTool(
      toolName,
      {
        description: toolDef.description,
        inputSchema: mcpSchema,
      },
      async (args: unknown, ctx: ServerContext) => {
        try {
          // Extract the original HTTP request from the MCP server context
          const httpReq = ctx.http?.req;
          if (!httpReq) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No HTTP request available in MCP context' }) }],
              isError: true,
            };
          }

          // Resolve authenticated identity (userId + optional agentId)
          const { userId, agentId } = await authResolver.resolveIdentity(httpReq);

          // Resolve chat context for the user (mark as MCP — no interactive UI available)
          const context = await resolveChatContext({ database: deps.database, userId });
          context.isMcp = true;
          if (agentId) {
            context.agentId = agentId;
          }

          // Build per-request scoped databases via injected factory
          const indexScope = context.userNetworks.map((m) => m.networkId);
          const scopedDbs = scopedDepsFactory.create(userId, indexScope);

          // Override deps with per-request scoped databases
          const requestDeps: ToolDeps = { ...deps, ...scopedDbs };

          // Re-create registry with per-request deps for scoped database access
          const requestRegistry = createToolRegistry(requestDeps);
          const requestTool = requestRegistry.get(toolName);

          if (!requestTool) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: `Tool "${toolName}" not found` }) }],
              isError: true,
            };
          }

          // Validate input against the original Zod schema
          const parseResult = (toolDef.schema as z.ZodType).safeParse(args);
          if (!parseResult.success) {
            const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: `Invalid input: ${issues}` }) }],
              isError: true,
            };
          }
          const validatedArgs = parseResult.data;

          // Execute the tool handler
          const result = await requestTool.handler({ context, query: validatedArgs });

          return {
            content: [{ type: 'text' as const, text: result }],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`MCP tool "${toolName}" failed`, { error: message });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
            isError: true,
          };
        }
      },
    );
  }

  logger.verbose(`MCP server created with ${registry.size} tools`);
  return server;
}
