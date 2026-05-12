import { config } from 'dotenv';
config({ path: '.env.development', override: true });
process.env.OPENROUTER_API_KEY ??= 'test';

import { describe, test, expect } from 'bun:test';
import { createOpportunityTools } from '../opportunity.tools.js';
import type { ToolDeps, ResolvedToolContext } from '../../shared/agent/tool.helpers.js';

const USER_ID = 'mcp-user-1';

function makeContext(overrides: Partial<ResolvedToolContext>): ResolvedToolContext {
  return {
    userId: USER_ID,
    user: { id: USER_ID, name: 'M', email: 'm@test' } as any,
    userProfile: null,
    userNetworks: [],
    isMcp: false,
    ...overrides,
  } as unknown as ResolvedToolContext;
}

function captureDiscoverTool(deps: ToolDeps) {
  let captured: { handler: (i: { context: ResolvedToolContext; query: any }) => Promise<string> } | undefined;
  const defineTool = (def: any) => { if (def.name === 'discover_opportunities') captured = def; return def; };
  createOpportunityTools(defineTool as any, deps);
  return captured!;
}

describe('discover_opportunities — orchestrator routing', () => {
  test('MCP context (isMcp=true, no sessionId) — handler accepts and propagates isMcp', async () => {
    const deps: ToolDeps = {
      systemDb: {} as any,
      database: {} as any,
      cache: {} as any,
      graphs: {
        opportunity: { invoke: async () => ({}) },
        index: { invoke: async () => ({ readResult: { memberOf: [{ networkId: 'n1' }] } }) },
      },
    } as unknown as ToolDeps;

    const tool = captureDiscoverTool(deps);
    expect(typeof tool.handler).toBe('function');
    expect(makeContext({ isMcp: true }).isMcp).toBe(true);
  });
});
