/**
 * Tests for Fix 1: Introducer cards should use single counterpart name when secondParty is present.
 *
 * Hypothesis: In home.graph.ts, userName is set to participantNames.join(' ↔ ') for introducers,
 * but secondPartyData is also populated for the arrow layout. The frontend renders card.name -> secondParty.name,
 * producing redundant names like "A ↔ B -> B". When secondPartyData is present, card.name should be
 * just the first counterpart name, not the joined format.
 */
import { config } from 'dotenv';
config({ path: '.env.test' });

import { describe, test, expect } from 'bun:test';
import { HomeGraphFactory } from '../../src/graphs/home.graph.js';
import type { HomeGraphDatabase } from '../../src/interfaces/database.interface.js';
import type { Opportunity } from '../../src/interfaces/database.interface.js';
import type { OpportunityCache } from '../../src/interfaces/cache.interface.js';

function createMockCache(): OpportunityCache {
  const store = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => (store.get(key) as T) ?? null,
    set: async <T>(key: string, value: T) => { store.set(key, value); },
    mget: async <T>(keys: string[]) => keys.map((k) => (store.get(k) as T) ?? null),
  };
}

const USER_MAP: Record<string, { id: string; name: string; email: string; avatar: string | null }> = {
  'intro-1': { id: 'intro-1', name: 'Intro User', email: 'intro@test.com', avatar: null },
  'party-a': { id: 'party-a', name: 'Mert Karadayi', email: 'mert@test.com', avatar: null },
  'party-b': { id: 'party-b', name: 'Yanki Ekin Yuksel', email: 'yanki@test.com', avatar: null },
};

function createMockDb(opportunities: Opportunity[]): HomeGraphDatabase {
  return {
    getOpportunitiesForUser: () => Promise.resolve(opportunities),
    getOpportunity: () => Promise.resolve(null),
    getProfile: () => Promise.resolve(null),
    getActiveIntents: () => Promise.resolve([]),
    getNetwork: () => Promise.resolve({ id: 'idx-1', title: 'Test Index' }),
    getUser: (id: string) => Promise.resolve(USER_MAP[id] ?? { id, name: 'Unknown User', email: '', avatar: null }),
  };
}

function makeIntroducerOpportunity(introducerId: string, partyAId: string, partyBId: string): Opportunity {
  return {
    id: 'opp-intro-1',
    detection: { source: 'opportunity_graph', timestamp: new Date().toISOString() },
    actors: [
      { userId: introducerId, role: 'introducer', indexId: 'idx-1' },
      { userId: partyAId, role: 'party', indexId: 'idx-1' },
      { userId: partyBId, role: 'party', indexId: 'idx-1' },
    ],
    interpretation: { reasoning: 'Good introduction match.', category: 'connection', confidence: 80 },
    context: { indexId: 'idx-1' },
    confidence: '0.8',
    status: 'latent',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null,
  };
}

describe('home.graph introducer card name format', () => {
  test('introducer card name should NOT use joined format when secondParty is present', async () => {
    const viewerId = 'intro-1';
    const opp = makeIntroducerOpportunity(viewerId, 'party-a', 'party-b');
    const db = createMockDb([opp]);
    const cache = createMockCache();
    const factory = new HomeGraphFactory(db, cache);
    const graph = factory.createGraph();

    const result = await graph.invoke({
      userId: viewerId,
      limit: 10,
      noCache: true,
    });

    // The graph should produce cards
    expect(result.cards.length).toBeGreaterThan(0);

    const card = result.cards[0];
    // card.name should be a single person's name, NOT "Mert Karadayi ↔ Yanki Ekin Yuksel"
    expect(card.name).not.toContain('↔');

    // secondParty should be populated
    expect(card.secondParty).toBeDefined();
    expect(card.secondParty?.name).toBeTruthy();

    // card.name and secondParty.name should be different people
    expect(card.name).not.toBe(card.secondParty?.name);

    // Both names should be actual person names
    const allNames = [card.name, card.secondParty?.name];
    expect(allNames).toContain('Mert Karadayi');
    expect(allNames).toContain('Yanki Ekin Yuksel');
  }, 30_000);
});
