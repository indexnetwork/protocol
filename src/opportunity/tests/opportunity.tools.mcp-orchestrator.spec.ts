import { config } from 'dotenv';
config({ path: '.env.development', override: true });
process.env.OPENROUTER_API_KEY ??= 'test';

import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Capture every call to runDiscoverFromQuery.
// mock.module is hoisted by Bun, so this runs before any static import of the mocked module.
type DiscoverCall = { trigger?: string; userId: string };
let discoverCalls: DiscoverCall[] = [];

mock.module('../opportunity.discover.js', () => ({
  runDiscoverFromQuery: async (args: Record<string, unknown>) => {
    discoverCalls.push({ trigger: args?.trigger as string | undefined, userId: args?.userId as string });
    return { found: false, count: 0, message: 'no results' };
  },
  // Stub the other named export so the import doesn't fail.
  continueDiscovery: async () => ({ found: false, count: 0, message: 'no results' }),
}));

// Import the tool factory AFTER mock.module so the mock is wired in.
const { createOpportunityTools } = await import('../opportunity.tools.js');
import type { ToolDeps, ResolvedToolContext } from '../../shared/agent/tool.helpers.js';

const USER_ID = 'mcp-user-1';

function makeContext(overrides: Partial<ResolvedToolContext>): ResolvedToolContext {
  return {
    userId: USER_ID,
    user: { id: USER_ID, name: 'M', email: 'm@test' } as any,
    userProfile: null,
    userNetworks: [],
    isMcp: false,
    sessionId: undefined,
    ...overrides,
  } as unknown as ResolvedToolContext;
}

function makeDeps(): ToolDeps {
  return {
    systemDb: {} as any,
    database: {} as any,
    cache: {} as any,
    graphs: {
      opportunity: { invoke: async () => ({}) },
      index: { invoke: async () => ({ readResult: { memberOf: [{ networkId: 'n1' }] } }) },
    },
  } as unknown as ToolDeps;
}

function captureDiscoverTool(deps: ToolDeps) {
  let captured: { handler: (i: { context: ResolvedToolContext; query: any }) => Promise<string> } | undefined;
  const defineTool = (def: any) => {
    if (def.name === 'discover_opportunities') captured = def;
    return def;
  };
  createOpportunityTools(defineTool as any, deps);
  return captured!;
}

describe('discover_opportunities — orchestrator trigger routing', () => {
  beforeEach(() => {
    discoverCalls = [];
  });

  test('MCP context (isMcp=true, sessionId undefined) → trigger: orchestrator', async () => {
    const tool = captureDiscoverTool(makeDeps());
    await tool.handler({ context: makeContext({ isMcp: true }), query: {} });

    expect(discoverCalls).toHaveLength(1);
    expect(discoverCalls[0].trigger).toBe('orchestrator');
  });

  test('Web chat context (sessionId set) → trigger: orchestrator', async () => {
    const tool = captureDiscoverTool(makeDeps());
    await tool.handler({ context: makeContext({ sessionId: 'session-abc' }), query: {} });

    expect(discoverCalls).toHaveLength(1);
    expect(discoverCalls[0].trigger).toBe('orchestrator');
  });

  test('Ambient context (isMcp=false, no sessionId) → trigger unset', async () => {
    const tool = captureDiscoverTool(makeDeps());
    await tool.handler({ context: makeContext({}), query: {} });

    expect(discoverCalls).toHaveLength(1);
    expect(discoverCalls[0].trigger).toBeUndefined();
  });
});
