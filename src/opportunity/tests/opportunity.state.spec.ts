/**
 * Unit tests for OpportunityGraphState — covers the `trigger` parameter
 * introduced by Plan B. A minimal LangGraph with a pass-through node is
 * compiled so we exercise the Annotation.Root reducers end-to-end rather
 * than introspecting Annotation internals (which shift across versions).
 */

import { describe, it, expect } from 'bun:test';
import { END, START, StateGraph } from '@langchain/langgraph';
import { OpportunityGraphState, type OpportunityTrigger } from '../opportunity.state.js';

function buildPassThroughGraph() {
  return new StateGraph(OpportunityGraphState)
    .addNode('passthrough', (state) => ({ userId: state.userId }))
    .addEdge(START, 'passthrough')
    .addEdge('passthrough', END)
    .compile();
}

describe('OpportunityGraphState.trigger', () => {
  it("defaults to 'ambient' when the caller omits trigger", async () => {
    const graph = buildPassThroughGraph();
    const result = await graph.invoke({ userId: 'u-1' });
    expect(result.trigger).toBe('ambient');
  });

  it("accepts 'orchestrator' when passed as a top-level invoke argument", async () => {
    const graph = buildPassThroughGraph();
    const result = await graph.invoke({ userId: 'u-1', trigger: 'orchestrator' });
    expect(result.trigger).toBe('orchestrator');
  });

  it("preserves 'ambient' when trigger is explicitly undefined", async () => {
    const graph = buildPassThroughGraph();
    const result = await graph.invoke({ userId: 'u-1', trigger: undefined as unknown as OpportunityTrigger });
    expect(result.trigger).toBe('ambient');
  });
});
