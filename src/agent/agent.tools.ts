import { z } from 'zod';

import type { DefineTool, ToolDeps } from '../shared/agent/tool.helpers.js';
import { error, success } from '../shared/agent/tool.helpers.js';

const AGENT_ACTIONS = [
  'manage:profile',
  'manage:intents',
  'manage:networks',
  'manage:contacts',
  'manage:negotiations',
] as const;

/**
 * Whitelist of webhook event names that personal agents may subscribe to.
 * Keep aligned with the events dispatched by {@link ../negotiation/negotiation.graph.ts}
 * and consumed by the OpenClaw plugin at `POST /index-network/webhook`.
 */
const WEBHOOK_EVENTS = [
  'negotiation.turn_received',
  'negotiation.completed',
] as const;

function isValidWebhookEvent(event: string): event is (typeof WEBHOOK_EVENTS)[number] {
  return (WEBHOOK_EVENTS as readonly string[]).includes(event);
}

function invalidActionMessage(action: string) {
  return `Invalid action: ${action}. Valid actions: ${AGENT_ACTIONS.join(', ')}`;
}

function isValidAction(action: string): action is (typeof AGENT_ACTIONS)[number] {
  return (AGENT_ACTIONS as readonly string[]).includes(action);
}

function requireAgentDatabase(deps: ToolDeps) {
  if (!deps.agentDatabase) {
    return null;
  }

  return deps.agentDatabase;
}

function ensureAgentScopedAccess(context: { agentId?: string }, requestedAgentId: string): string | null {
  if (context.agentId && context.agentId !== requestedAgentId) {
    return 'This agent can only manage its own registration.';
  }

  return null;
}

function sanitizeAgentForOutput<T extends { transports?: Array<{ channel: string; config: Record<string, unknown> }> }>(agent: T): T {
  return {
    ...agent,
    transports: agent.transports?.map((transport) => ({
      ...transport,
      config: transport.channel === 'webhook'
        ? Object.fromEntries(Object.entries(transport.config).filter(([key]) => key !== 'secret'))
        : transport.config,
    })),
  };
}

function normalizeWebhookEvents(events: string[] | undefined): string[] {
  return [...new Set((events ?? []).map((event) => event.trim()).filter(Boolean))];
}

function sanitizeAgentName(name: string): string | null {
  const cleanName = name.trim();
  return cleanName ? cleanName : null;
}

function normalizePermissions(permissions: string[] | undefined): string[] {
  return [...new Set((permissions ?? []).map((action) => action.trim()).filter(Boolean))];
}

export function createAgentTools(defineTool: DefineTool, deps: ToolDeps) {
  const agentDb = requireAgentDatabase(deps);
  if (!agentDb) {
    return [];
  }

  const registerAgent = defineTool({
    name: 'register_agent',
    description:
      'Register a new personal agent for the current user. Optionally configure a webhook transport and initial permissions. ' +
      'Use this when connecting an external agent to Index.',
    querySchema: z.object({
      name: z.string().min(1).describe('Display name for the agent.'),
      description: z.string().optional().describe('What the agent does.'),
      webhook_url: z.string().optional().describe('Optional webhook URL for deliveries.'),
      webhook_secret: z.string().optional().describe('Optional webhook secret stored in transport config.'),
      webhook_events: z.array(z.string()).optional().describe('Subscribed webhook event names.'),
      permissions: z.array(z.string()).optional().describe('Optional initial permission actions to grant.'),
    }),
    handler: async ({ context, query }) => {
      if (context.agentId) {
        return error('This agent can only manage its own registration.');
      }

      try {
        const name = sanitizeAgentName(query.name);
        if (!name) {
          return error('Agent name is required.');
        }

        const permissions = normalizePermissions(query.permissions);
        for (const permission of permissions) {
          if (!isValidAction(permission)) {
            return error(invalidActionMessage(permission));
          }
        }

        let transportConfig: Record<string, unknown> | undefined;
        if (query.webhook_url?.trim()) {
          const webhookEvents = normalizeWebhookEvents(query.webhook_events);
          if (webhookEvents.length === 0) {
            return error('Webhook events are required.');
          }

          let parsedUrl: URL;
          try {
            parsedUrl = new URL(query.webhook_url);
          } catch {
            return error('Invalid webhook URL.');
          }

          if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
            return error('Webhook URL must use HTTPS in production.');
          }

          transportConfig = {
            url: parsedUrl.toString(),
            events: webhookEvents,
            ...(query.webhook_secret?.trim() ? { secret: query.webhook_secret.trim() } : {}),
          };
        }

        const agent = await agentDb.createAgent({
          ownerId: context.userId,
          name,
          description: query.description?.trim() || undefined,
          type: 'personal',
        });

        try {
          if (transportConfig) {
            await agentDb.createTransport({
              agentId: agent.id,
              channel: 'webhook',
              config: transportConfig,
            });
          }

          if (permissions.length > 0) {
            await agentDb.grantPermission({
              agentId: agent.id,
              userId: context.userId,
              scope: 'global',
              actions: permissions,
            });
          }
        } catch (setupError) {
          try {
            await agentDb.deleteAgent(agent.id);
          } catch {
            // Best-effort cleanup to avoid leaving partially registered agents behind.
          }

          throw setupError;
        }

        const fullAgent = await agentDb.getAgentWithRelations(agent.id);
        return success({
          message: `Agent "${agent.name}" registered successfully.`,
          agent: sanitizeAgentForOutput(fullAgent ?? ({ ...agent, transports: [], permissions: [] })),
        });
      } catch (err) {
        return error(`Failed to register agent: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const addWebhookTransport = defineTool({
    name: 'add_webhook_transport',
    description:
      'Attach or replace the webhook transport on the calling agent. Requires an authenticated agent identity (x-api-key). ' +
      'Replaces any existing webhook transport on this agent (one agent = one webhook transport, multiple events). ' +
      'Also grants manage:negotiations permission if not already present.',
    querySchema: z.object({
      url: z.string().min(1).describe('HTTPS URL that will receive webhook deliveries.'),
      secret: z.string().min(1).describe('Shared HMAC secret for signing deliveries.'),
      events: z.array(z.string()).min(1).describe('Subscribed webhook event names.'),
    }),
    handler: async ({ context, query }) => {
      if (!context.agentId) {
        return error(
          'add_webhook_transport requires an authenticated agent. Call register_agent first, or authenticate with an agent-bound API key.',
        );
      }

      try {
        const events = normalizeWebhookEvents(query.events);
        if (events.length === 0) {
          return error('Webhook events are required.');
        }
        for (const event of events) {
          if (!isValidWebhookEvent(event)) {
            return error(
              `Invalid webhook event: ${event}. Valid events: ${WEBHOOK_EVENTS.join(', ')}`,
            );
          }
        }

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(query.url);
        } catch {
          return error('Invalid webhook URL.');
        }

        if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
          return error('Webhook URL must use HTTPS in production.');
        }

        const agent = await agentDb.getAgentWithRelations(context.agentId);
        if (!agent || agent.ownerId !== context.userId) {
          return error('Agent not found.');
        }
        if (agent.type === 'system') {
          return error('System agents cannot be modified.');
        }

        for (const existing of agent.transports) {
          if (existing.channel === 'webhook') {
            await agentDb.deleteTransport(existing.id);
          }
        }

        const transport = await agentDb.createTransport({
          agentId: agent.id,
          channel: 'webhook',
          config: { url: parsedUrl.toString(), events, secret: query.secret },
        });

        const hasNegotiationsPermission = agent.permissions.some(
          (p) => p.scope === 'global' && p.actions.includes('manage:negotiations'),
        );
        if (!hasNegotiationsPermission) {
          await agentDb.grantPermission({
            agentId: agent.id,
            userId: context.userId,
            scope: 'global',
            actions: ['manage:negotiations'],
          });
        }

        return success({
          message: `Webhook transport added for "${agent.name}".`,
          transport: {
            id: transport.id,
            channel: transport.channel,
            events: [...events],
            active: transport.active,
          },
        });
      } catch (err) {
        return error(
          `Failed to add webhook transport: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  const listAgents = defineTool({
    name: 'list_agents',
    description: 'List all agents the current user owns or has authorized.',
    querySchema: z.object({}),
    handler: async ({ context }) => {
      try {
        const agents = await agentDb.listAgentsForUser(context.userId);
        const filteredAgents = context.agentId
          ? agents.filter((agent) => agent.id === context.agentId)
          : agents;
        return success({
          agents: filteredAgents.map((agent) => sanitizeAgentForOutput(agent)),
          count: filteredAgents.length,
        });
      } catch (err) {
        return error(`Failed to list agents: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const updateAgent = defineTool({
    name: 'update_agent',
    description: 'Update an agent name, description, or status.',
    querySchema: z.object({
      agent_id: z.string().min(1).describe('The agent ID to update.'),
      name: z.string().optional().describe('Updated display name.'),
      description: z.string().optional().describe('Updated description.'),
      status: z.enum(['active', 'inactive']).optional().describe('Updated status.'),
    }),
    handler: async ({ context, query }) => {
      const scopeError = ensureAgentScopedAccess(context, query.agent_id);
      if (scopeError) {
        return error(scopeError);
      }

      try {
        const agent = await agentDb.getAgent(query.agent_id);
        if (!agent || agent.ownerId !== context.userId) {
          return error('Agent not found');
        }

        if (agent.type === 'system') {
          return error('System agents cannot be modified');
        }

        const updates: { name?: string; description?: string | null; status?: 'active' | 'inactive' } = {};
        if (query.name !== undefined) {
          const name = query.name.trim();
          if (!name) {
            return error('Agent name is required');
          }
          updates.name = name;
        }
        if (query.description !== undefined) {
          updates.description = query.description.trim() || null;
        }
        if (query.status) {
          updates.status = query.status;
        }

        if (Object.keys(updates).length === 0) {
          return error('At least one field is required.');
        }

        const updated = await agentDb.updateAgent(query.agent_id, updates);
        if (!updated) {
          return error('Agent not found');
        }

        const fullAgent = await agentDb.getAgentWithRelations(query.agent_id);
        return success({
          message: 'Agent updated.',
          agent: sanitizeAgentForOutput(fullAgent ?? ({ ...updated, transports: [], permissions: [] })),
        });
      } catch (err) {
        return error(`Failed to update agent: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const deleteAgent = defineTool({
    name: 'delete_agent',
    description: 'Soft-delete a personal agent and deactivate its transports.',
    querySchema: z.object({
      agent_id: z.string().min(1).describe('The agent ID to delete.'),
    }),
    handler: async ({ context, query }) => {
      const scopeError = ensureAgentScopedAccess(context, query.agent_id);
      if (scopeError) {
        return error(scopeError);
      }

      try {
        const agent = await agentDb.getAgent(query.agent_id);
        if (!agent || agent.ownerId !== context.userId) {
          return error('Agent not found');
        }
        if (agent.type === 'system') {
          return error('System agents cannot be deleted');
        }

        await agentDb.deleteAgent(query.agent_id);
        return success({ message: `Agent "${agent.name}" deleted.` });
      } catch (err) {
        return error(`Failed to delete agent: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const grantAgentPermission = defineTool({
    name: 'grant_agent_permission',
    description: 'Grant one or more permissions to an agent for the current user. ' +
      'Valid actions: manage:profile, manage:intents, manage:networks, manage:contacts, manage:negotiations.',
    querySchema: z.object({
      agent_id: z.string().min(1).describe('The agent ID to grant permissions to.'),
      actions: z.array(z.string()).min(1).describe('Permission actions to grant. Valid values: manage:profile, manage:intents, manage:networks, manage:contacts, manage:negotiations.'),
      scope: z.enum(['global', 'node', 'network']).optional().describe('Optional permission scope.'),
      scope_id: z.string().optional().describe('Scope target ID for node/network scopes.'),
    }),
    handler: async ({ context, query }) => {
      const scopeError = ensureAgentScopedAccess(context, query.agent_id);
      if (scopeError) {
        return error(scopeError);
      }

      const actions = [...new Set(query.actions.map((action) => action.trim()).filter(Boolean))];
      if (actions.length === 0) {
        return error('At least one non-empty action is required.');
      }

      for (const action of actions) {
        if (!isValidAction(action)) {
          return error(invalidActionMessage(action));
        }
      }

      if ((query.scope === 'network' || query.scope === 'node') && !query.scope_id?.trim()) {
        return error(`scope_id is required for ${query.scope} permissions.`);
      }

      try {
        const agent = await agentDb.getAgent(query.agent_id);
        if (!agent || agent.ownerId !== context.userId) {
          return error('Agent not found');
        }

        const permission = await agentDb.grantPermission({
          agentId: query.agent_id,
          userId: context.userId,
          scope: query.scope,
          scopeId: query.scope === 'global' || query.scope === undefined ? undefined : query.scope_id?.trim(),
          actions,
        });

        return success({ message: 'Permission granted.', permission });
      } catch (err) {
        return error(`Failed to grant permission: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  const revokeAgentPermission = defineTool({
    name: 'revoke_agent_permission',
    description: 'Revoke a specific permission from an agent.',
    querySchema: z.object({
      agent_id: z.string().min(1).describe('The agent ID that owns the permission.'),
      permission_id: z.string().min(1).describe('The permission ID to revoke.'),
    }),
    handler: async ({ context, query }) => {
      const scopeError = ensureAgentScopedAccess(context, query.agent_id);
      if (scopeError) {
        return error(scopeError);
      }

      try {
        const agent = await agentDb.getAgentWithRelations(query.agent_id);
        if (!agent || agent.ownerId !== context.userId) {
          return error('Agent not found');
        }

        const permission = agent.permissions.find((item) => item.id === query.permission_id);
        if (!permission) {
          return error('Permission not found');
        }

        await agentDb.revokePermission(query.permission_id);
        return success({ message: 'Permission revoked.' });
      } catch (err) {
        return error(`Failed to revoke permission: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  return [
    registerAgent,
    addWebhookTransport,
    listAgents,
    updateAgent,
    deleteAgent,
    grantAgentPermission,
    revokeAgentPermission,
  ] as const;
}
