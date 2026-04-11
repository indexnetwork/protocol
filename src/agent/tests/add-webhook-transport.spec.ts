/** Config */
import { config } from 'dotenv';
config({ path: '.env.test' });

import { describe, it, expect, beforeEach } from 'bun:test';

import type { DefineTool, ToolDeps, ResolvedToolContext } from '../../shared/agent/tool.helpers.js';
import type { AgentTransportRecord, AgentPermissionRecord } from '../../shared/interfaces/agent.interface.js';

import { createAgentTools } from '../agent.tools.js';
import { createFakeAgentDb, type FakeAgentDb } from './fakes.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

interface ToolSpec {
  name: string;
  handler: (input: { context: ResolvedToolContext; query: unknown }) => Promise<string>;
}

function makeDefineTool(): { defineTool: DefineTool; tools: Map<string, ToolSpec> } {
  const tools = new Map<string, ToolSpec>();
  const defineTool: DefineTool = (spec) => {
    tools.set(spec.name, spec as ToolSpec);
    return spec;
  };
  return { defineTool, tools };
}

function toolDeps(agentDb: FakeAgentDb): ToolDeps {
  return { agentDatabase: agentDb } as unknown as ToolDeps;
}

function buildContext(overrides: Partial<ResolvedToolContext>): ResolvedToolContext {
  return {
    userId: 'user-1',
    userName: 'Test User',
    userEmail: 'test@example.com',
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } as never,
    userProfile: null,
    userNetworks: [],
    isOnboarding: false,
    hasName: true,
    ...overrides,
  };
}

async function callTool(
  tools: Map<string, ToolSpec>,
  name: string,
  context: ResolvedToolContext,
  query: unknown,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const tool = tools.get(name);
  if (!tool) throw new Error(`tool ${name} not found`);
  const raw = await tool.handler({ context, query });
  return JSON.parse(raw) as { success: boolean; data?: unknown; error?: string };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('add_webhook_transport', () => {
  let agentDb: FakeAgentDb;
  let tools: Map<string, ToolSpec>;

  beforeEach(async () => {
    agentDb = createFakeAgentDb();
    const { defineTool, tools: registered } = makeDefineTool();
    createAgentTools(defineTool, toolDeps(agentDb));
    tools = registered;

    await agentDb.seedAgent({
      id: 'agent-1',
      ownerId: 'user-1',
      type: 'personal',
      name: 'Yanek Personal',
    });
  });

  it('rejects callers without an authenticated agent identity', async () => {
    const result = await callTool(tools, 'add_webhook_transport', buildContext({ agentId: undefined }), {
      url: 'https://example.com/hook',
      secret: 's',
      events: ['negotiation.turn_received'],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated agent');
  });

  it('creates a webhook transport and grants manage:negotiations', async () => {
    const result = await callTool(
      tools,
      'add_webhook_transport',
      buildContext({ agentId: 'agent-1' }),
      {
        url: 'https://example.com/index-network/webhook',
        secret: 'shhh',
        events: ['negotiation.turn_received', 'negotiation.completed'],
      },
    );
    expect(result.success).toBe(true);
    const data = result.data as { message: string };
    expect(data.message).toContain('added');

    const agent = await agentDb.getAgentWithRelations('agent-1');
    expect(agent).not.toBeNull();
    expect(agent!.transports).toHaveLength(1);

    const transport = agent!.transports[0] as AgentTransportRecord;
    expect(transport.channel).toBe('webhook');
    const cfg = transport.config as { url: string; events: string[]; secret: string };
    expect(cfg.url).toBe('https://example.com/index-network/webhook');
    expect(cfg.events).toEqual(['negotiation.turn_received', 'negotiation.completed']);
    expect(cfg.secret).toBe('shhh');

    const negotiationPermission = agent!.permissions.find((p: AgentPermissionRecord) =>
      p.actions.includes('manage:negotiations'),
    );
    expect(negotiationPermission).toBeDefined();
  });

  it('replaces an existing webhook transport (idempotent)', async () => {
    await agentDb.createTransport({
      agentId: 'agent-1',
      channel: 'webhook',
      config: { url: 'https://old.example.com/hook', events: ['negotiation.started'], secret: 'old' },
    });

    const result = await callTool(
      tools,
      'add_webhook_transport',
      buildContext({ agentId: 'agent-1' }),
      {
        url: 'https://new.example.com/hook',
        secret: 'new',
        events: ['negotiation.turn_received'],
      },
    );
    expect(result.success).toBe(true);

    const agent = await agentDb.getAgentWithRelations('agent-1');
    expect(agent).not.toBeNull();
    expect(agent!.transports).toHaveLength(1);
    const cfg = agent!.transports[0].config as { url: string; secret: string };
    expect(cfg.url).toBe('https://new.example.com/hook');
    expect(cfg.secret).toBe('new');
  });

  it('rejects an invalid event name', async () => {
    const result = await callTool(
      tools,
      'add_webhook_transport',
      buildContext({ agentId: 'agent-1' }),
      { url: 'https://example.com/hook', secret: 's', events: ['not.an.event'] },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid webhook event');
  });

  it('rejects a malformed URL', async () => {
    const result = await callTool(
      tools,
      'add_webhook_transport',
      buildContext({ agentId: 'agent-1' }),
      { url: 'not-a-url', secret: 's', events: ['negotiation.turn_received'] },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid webhook URL');
  });
});
