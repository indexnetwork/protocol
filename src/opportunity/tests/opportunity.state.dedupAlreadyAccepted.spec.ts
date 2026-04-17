/**
 * Unit tests for the `dedupAlreadyAccepted` state field introduced in Plan B
 * Task 6. The orchestrator branch of the persist node populates this so the
 * create_opportunities tool (Task 7) can tell the LLM when candidate pairs
 * already have an accepted opportunity and should reuse the existing chat.
 */

import { describe, it, expect } from 'bun:test';
import { END, START, StateGraph } from '@langchain/langgraph';
import { OpportunityGraphState } from '../opportunity.state.js';

function buildPassThroughGraph() {
  return new StateGraph(OpportunityGraphState)
    .addNode('passthrough', (state) => ({ userId: state.userId }))
    .addEdge(START, 'passthrough')
    .addEdge('passthrough', END)
    .compile();
}

describe('OpportunityGraphState.dedupAlreadyAccepted', () => {
  it('defaults to an empty array when the caller omits it', async () => {
    const graph = buildPassThroughGraph();
    const result = await graph.invoke({ userId: 'u-1' });
    expect(result.dedupAlreadyAccepted).toEqual([]);
  });

  it('accepts a seeded value when passed as a top-level invoke argument', async () => {
    const graph = buildPassThroughGraph();
    const seed = [
      { opportunityId: 'opp-a', counterpartyUserId: 'user-b' },
      { opportunityId: 'opp-c', counterpartyUserId: 'user-d' },
    ];
    const result = await graph.invoke({ userId: 'u-1', dedupAlreadyAccepted: seed });
    expect(result.dedupAlreadyAccepted).toEqual(seed);
  });
});
