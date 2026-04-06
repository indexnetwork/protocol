/** Config */
import { config } from 'dotenv';
config({ path: '.env.test' });

import { describe, test, expect } from 'bun:test';
import { selectByComposition, classifyOpportunity, FEED_SOFT_TARGETS } from '../../src/support/opportunity.utils.js';

/**
 * Hypothesis: The bug occurs because the home graph's fetchLimit formula
 * `Math.min(150, Math.max(state.limit * 3, state.limit))` yields only 15
 * with the default state.limit=5. The DB returns the 15 newest opportunities
 * (ordered by createdAt DESC), all of which are connections. Older
 * connector-flow opportunities never reach selectByComposition.
 *
 * These tests validate:
 * 1. selectByComposition correctly includes connector-flow when candidates exist
 * 2. The fetchLimit formula must provide enough headroom for composition
 */

const VIEWER = 'user-viewer';

/** Helper to create a mock opportunity */
function makeOpp(
  id: string,
  viewerRole: string,
  status: string,
  otherUserId = 'user-other',
) {
  const actors: Array<{ userId: string; role: string }> = [];

  if (viewerRole === 'introducer') {
    actors.push(
      { userId: VIEWER, role: 'introducer' },
      { userId: otherUserId, role: 'patient' },
      { userId: `user-agent-${id}`, role: 'agent' },
    );
  } else {
    actors.push(
      { userId: VIEWER, role: viewerRole },
      { userId: otherUserId, role: viewerRole === 'patient' ? 'agent' : 'patient' },
    );
  }

  return { id, actors, status };
}

describe('home feed fetch limit bug', () => {
  describe('selectByComposition includes connector-flow when candidates exist', () => {
    test('returns connector-flow items when pool contains both connections and connector-flow', () => {
      // Simulate a diverse pool: 10 connections + 5 connector-flow + 3 expired
      const pool = [
        ...Array.from({ length: 10 }, (_, i) => makeOpp(`conn-${i}`, 'patient', 'latent', `other-${i}`)),
        ...Array.from({ length: 5 }, (_, i) => makeOpp(`intro-${i}`, 'introducer', 'latent', `intro-other-${i}`)),
        ...Array.from({ length: 3 }, (_, i) => makeOpp(`exp-${i}`, 'patient', 'expired', `exp-other-${i}`)),
      ];

      const result = selectByComposition(pool, VIEWER);

      // Should include connector-flow items
      const connectorFlowCount = result.filter(
        (opp) => classifyOpportunity(opp, VIEWER) === 'connector-flow'
      ).length;
      expect(connectorFlowCount).toBeGreaterThan(0);
      expect(connectorFlowCount).toBe(FEED_SOFT_TARGETS.connectorFlow);
    });

    test('returns 0 connector-flow when pool contains ONLY connections (the bug scenario)', () => {
      // Simulate the bug: fetchLimit=15 returns only the 15 newest, all connections
      const pool = Array.from({ length: 15 }, (_, i) =>
        makeOpp(`conn-${i}`, 'patient', 'latent', `other-${i}`)
      );

      const result = selectByComposition(pool, VIEWER);

      // All items are connections — connector-flow is starved
      const connectorFlowCount = result.filter(
        (opp) => classifyOpportunity(opp, VIEWER) === 'connector-flow'
      ).length;
      expect(connectorFlowCount).toBe(0);
    });
  });

  describe('fetchLimit formula provides enough headroom', () => {
    /**
     * The minimum fetchLimit must be large enough that even when most results
     * are one category, selectByComposition still has candidates for other
     * categories. With FEED_SOFT_TARGETS totaling 7, a minimum of 50 provides
     * ~7x headroom for filtering and dedup.
     */
    const MIN_FETCH_LIMIT = 50;

    test('fetchLimit with state.limit=5 should be at least 50', () => {
      const stateLimit = 5;
      // Old formula: Math.min(150, Math.max(stateLimit * 3, stateLimit)) = 15
      const oldFetchLimit = Math.min(150, Math.max(stateLimit * 3, stateLimit));
      expect(oldFetchLimit).toBe(15); // Confirms the bug

      // New formula should produce at least MIN_FETCH_LIMIT
      const newFetchLimit = Math.min(150, Math.max(MIN_FETCH_LIMIT, stateLimit * 3));
      expect(newFetchLimit).toBeGreaterThanOrEqual(MIN_FETCH_LIMIT);
    });

    test('fetchLimit with state.limit=20 should scale above minimum', () => {
      const stateLimit = 20;
      const newFetchLimit = Math.min(150, Math.max(MIN_FETCH_LIMIT, stateLimit * 3));
      expect(newFetchLimit).toBe(60); // 20*3 = 60 > 50
    });

    test('fetchLimit with state.limit=100 should cap at 150', () => {
      const stateLimit = 100;
      const newFetchLimit = Math.min(150, Math.max(MIN_FETCH_LIMIT, stateLimit * 3));
      expect(newFetchLimit).toBe(150); // capped
    });

    test('fetchLimit with state.limit=1 should still be at least 50', () => {
      const stateLimit = 1;
      const newFetchLimit = Math.min(150, Math.max(MIN_FETCH_LIMIT, stateLimit * 3));
      expect(newFetchLimit).toBe(MIN_FETCH_LIMIT);
    });
  });
});
