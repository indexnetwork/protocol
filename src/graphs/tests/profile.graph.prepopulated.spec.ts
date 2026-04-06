import { config } from 'dotenv';
config({ path: '.env.development', override: true });

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ProfileGraphFactory } from '../profile.graph.js';
import type { ProfileGraphDatabase } from '../../interfaces/database.interface.js';
import type { Embedder } from '../../interfaces/embedder.interface.js';
import type { Scraper } from '../../interfaces/scraper.interface.js';

/**
 * Tests for the pre-populated profile path in ProfileGraph.
 * When a prePopulatedProfile is provided (e.g. from Parallel Chat API),
 * the graph should skip LLM profile generation and go directly to embedding + HyDE.
 */
describe('ProfileGraph - Pre-Populated Profile Path', () => {
  let mockDatabase: ProfileGraphDatabase;
  let mockEmbedder: Embedder;
  let mockScraper: Scraper;
  let savedProfiles: Map<string, unknown>;

  const prePopulatedProfile = {
    identity: {
      name: 'Sarah Hoople Shere',
      bio: 'VP of Operations at TechCo with experience in scaling startups.',
      location: 'San Francisco, CA',
    },
    narrative: {
      context: 'Sarah is currently VP of Operations at TechCo, focused on scaling the company.',
    },
    attributes: {
      skills: ['operations', 'strategy', 'scaling'],
      interests: ['startups', 'leadership'],
    },
  };

  beforeEach(() => {
    savedProfiles = new Map();

    mockDatabase = {
      getProfile: mock(async () => null),
      getProfileByUserId: mock(async () => null),
      getUser: mock(async () => ({
        id: 'ghost-sarah',
        name: 'Sarah Hoople Shere',
        email: 'sarah@example.com',
        socials: null,
        location: null,
        intro: null,
      })),
      updateUser: mock(async (userId: string, data: unknown) => ({ id: userId, ...data as object })),
      saveProfile: mock(async (userId: string, profile: unknown) => {
        savedProfiles.set(userId, profile);
      }),
      getHydeDocument: mock(async () => null),
      saveHydeDocument: mock(async () => ({ id: 'mock-hyde-doc-id' })),
      softDeleteGhost: mock(async () => true),
    } as unknown as ProfileGraphDatabase;

    mockEmbedder = {
      generate: mock(async () => Array(2000).fill(0.01)),
    } as unknown as Embedder;

    mockScraper = {
      scrape: mock(async () => ''),
    } as unknown as Scraper;
  });

  function buildGraph() {
    return new ProfileGraphFactory(mockDatabase, mockEmbedder, mockScraper).createGraph();
  }

  it('skips profile generation and saves pre-populated profile directly', async () => {
    const graph = buildGraph();
    const result = await graph.invoke({
      userId: 'ghost-sarah',
      operationMode: 'generate',
      prePopulatedProfile,
    });

    expect(result.error).toBeUndefined();
    expect(result.profile).toBeDefined();
    expect(result.profile!.identity.name).toBe('Sarah Hoople Shere');
    expect(result.profile!.identity.bio).toBe(prePopulatedProfile.identity.bio);

    // Profile was saved (embedding step ran)
    expect(mockDatabase.saveProfile).toHaveBeenCalledWith('ghost-sarah', expect.anything());

    // Embedder was called (for profile embedding)
    expect(mockEmbedder.generate).toHaveBeenCalled();

    // Scraper was NOT called (skipped generation entirely)
    expect(mockScraper.scrape).not.toHaveBeenCalled();
  }, 30_000);

  it('generates HyDE document after embedding pre-populated profile', async () => {
    const graph = buildGraph();
    const result = await graph.invoke({
      userId: 'ghost-sarah',
      operationMode: 'generate',
      prePopulatedProfile,
    });

    expect(result.error).toBeUndefined();

    // HyDE document was saved
    expect(mockDatabase.saveHydeDocument).toHaveBeenCalled();

    // Embedder called at least twice: once for profile, once for HyDE
    expect((mockEmbedder.generate as ReturnType<typeof mock>).mock.calls.length).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it('preserves profile attributes from pre-populated data', async () => {
    const graph = buildGraph();
    const result = await graph.invoke({
      userId: 'ghost-sarah',
      operationMode: 'generate',
      prePopulatedProfile,
    });

    expect(result.profile!.attributes.skills).toEqual(['operations', 'strategy', 'scaling']);
    expect(result.profile!.attributes.interests).toEqual(['startups', 'leadership']);
  }, 30_000);

  it('falls back to auto_generate when no prePopulatedProfile is provided', async () => {
    (mockDatabase.getUser as ReturnType<typeof mock>).mockResolvedValue({
      id: 'ghost-sarah',
      name: 'Sarah Hoople Shere',
      email: 'sarah@example.com',
      socials: null,
      location: null,
      intro: null,
    });

    const graph = buildGraph();
    const result = await graph.invoke({
      userId: 'ghost-sarah',
      operationMode: 'generate',
      // No prePopulatedProfile — should go through auto_generate path
    });

    // Should still succeed (falling back to basic info generation)
    expect(result.profile).toBeDefined();
    expect(mockDatabase.saveProfile).toHaveBeenCalled();
  }, 120_000);
});
