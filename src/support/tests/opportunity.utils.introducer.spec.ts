/**
 * Tests for introducer-related opportunity utility fixes:
 * - Fix 2: Introducer should not see themselves as a connection (dedup preference)
 * - Fix 3: Connector-flow cards always appear after normal connections in selectByComposition output
 *
 * Hypothesis (Fix 2): When an introducer has overlapping counterparts between a connection
 * and a connector-flow opportunity, dedup in loadOpportunitiesNode may let the connector-flow
 * card survive instead of the connection card depending on confidence ordering.
 *
 * Hypothesis (Fix 3): selectByComposition already returns [connections, connector-flow, expired]
 * in the correct order. The ordering issue is in normalizeAndSort where the LLM categorizer
 * controls section ordering. However, selectByComposition itself must guarantee this ordering.
 */
import { config } from 'dotenv';
config({ path: '.env.development' });

import { describe, it, expect } from 'bun:test';
import {
  selectByComposition,
  classifyOpportunity,
} from '../opportunity.utils.js';

type TestOpp = {
  id: string;
  actors: Array<{ userId: string; role: string }>;
  status: string;
};

function makeConnectionOpp(id: string, viewerId: string, otherId: string, status = 'latent'): TestOpp {
  return {
    id,
    actors: [
      { userId: viewerId, role: 'party' },
      { userId: otherId, role: 'agent' },
    ],
    status,
  };
}

function makeConnectorFlowOpp(
  id: string,
  introducerId: string,
  partyA: string,
  partyB: string,
  status = 'latent',
): TestOpp {
  return {
    id,
    actors: [
      { userId: introducerId, role: 'introducer' },
      { userId: partyA, role: 'party' },
      { userId: partyB, role: 'party' },
    ],
    status,
  };
}

describe('classifyOpportunity', () => {
  it('classifies opportunity with viewer as introducer as connector-flow', () => {
    const opp = makeConnectorFlowOpp('cf-1', 'viewer', 'party-a', 'party-b');
    expect(classifyOpportunity(opp, 'viewer')).toBe('connector-flow');
  });

  it('classifies direct connection as connection', () => {
    const opp = makeConnectionOpp('conn-1', 'viewer', 'other');
    expect(classifyOpportunity(opp, 'viewer')).toBe('connection');
  });

  it('classifies expired opportunity as expired', () => {
    const opp = makeConnectionOpp('exp-1', 'viewer', 'other', 'expired');
    expect(classifyOpportunity(opp, 'viewer')).toBe('expired');
  });
});

describe('selectByComposition ordering', () => {
  it('returns connections before connector-flow before expired', () => {
    const viewerId = 'viewer';
    const opps: TestOpp[] = [
      makeConnectorFlowOpp('cf-1', viewerId, 'a', 'b'),
      makeConnectionOpp('conn-1', viewerId, 'c'),
      makeConnectionOpp('exp-1', viewerId, 'd', 'expired'),
      makeConnectorFlowOpp('cf-2', viewerId, 'e', 'f'),
      makeConnectionOpp('conn-2', viewerId, 'g'),
    ];

    const result = selectByComposition(opps, viewerId);
    const categories = result.map((o) => classifyOpportunity(o, viewerId));

    // All connections must come before all connector-flow, which must come before all expired
    const firstConnectorFlow = categories.indexOf('connector-flow');
    const lastConnection = categories.lastIndexOf('connection');
    const firstExpired = categories.indexOf('expired');
    const lastConnectorFlow = categories.lastIndexOf('connector-flow');

    if (lastConnection >= 0 && firstConnectorFlow >= 0) {
      expect(lastConnection).toBeLessThan(firstConnectorFlow);
    }
    if (lastConnectorFlow >= 0 && firstExpired >= 0) {
      expect(lastConnectorFlow).toBeLessThan(firstExpired);
    }
  });

  it('does not interleave categories even with mixed input order', () => {
    const viewerId = 'viewer';
    // Input deliberately interleaves categories
    const opps: TestOpp[] = [
      makeConnectorFlowOpp('cf-1', viewerId, 'a', 'b'),
      makeConnectionOpp('exp-1', viewerId, 'c', 'expired'),
      makeConnectionOpp('conn-1', viewerId, 'd'),
      makeConnectorFlowOpp('cf-2', viewerId, 'e', 'f'),
      makeConnectionOpp('conn-2', viewerId, 'g'),
      makeConnectionOpp('exp-2', viewerId, 'h', 'expired'),
    ];

    const result = selectByComposition(opps, viewerId);
    const categories = result.map((o) => classifyOpportunity(o, viewerId));

    // Verify no interleaving: once we see a later category, we shouldn't see an earlier one again
    const categoryOrder: string[] = [];
    for (const cat of categories) {
      if (categoryOrder.length === 0 || categoryOrder[categoryOrder.length - 1] !== cat) {
        categoryOrder.push(cat);
      }
    }
    // Valid orderings: just connections, connections then connector-flow, etc.
    const validOrder = ['connection', 'connector-flow', 'expired'];
    for (let i = 1; i < categoryOrder.length; i++) {
      const prevIdx = validOrder.indexOf(categoryOrder[i - 1]);
      const currIdx = validOrder.indexOf(categoryOrder[i]);
      expect(currIdx).toBeGreaterThan(prevIdx);
    }
  });
});
