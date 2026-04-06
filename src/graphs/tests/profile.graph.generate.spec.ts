/** Config */
import { config } from "dotenv";
config({ path: '.env.development', override: true });

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ProfileGraphFactory } from '../profile.graph.js';
import type { ProfileGraphDatabase } from '../../interfaces/database.interface.js';
import type { Embedder } from '../../interfaces/embedder.interface.js';
import type { Scraper } from '../../interfaces/scraper.interface.js';

const mockEnrichUserProfile = mock(async () => null as any);

/**
 * Integration tests for generate mode (ghost user profile generation).
 *
 * These tests mock the enrichUserProfile Chat API call and verify that the
 * profile graph correctly handles both enrichment success (prePopulatedProfile)
 * and fallback to LLM-based generation.
 */
describe('ProfileGraph - Generate Mode', () => {
  let mockDatabase: ProfileGraphDatabase;
  let mockEmbedder: Embedder;
  let mockScraper: Scraper;

  let savedProfiles: Map<string, any>;

  beforeEach(() => {
    savedProfiles = new Map();
    mockEnrichUserProfile.mockReset();

    mockDatabase = {
      getProfile: mock(async () => null),
      getProfileByUserId: mock(async () => null),
      getUser: mock(async () => null),
      updateUser: mock(async (userId: string, data: any) => ({ id: userId, ...data })),
      saveProfile: mock(async (userId: string, profile: any) => {
        savedProfiles.set(userId, profile);
      }),
      getHydeDocument: mock(async () => null),
      saveHydeDocument: mock(async () => ({ id: 'mock-hyde-doc-id' })),
      softDeleteGhost: mock(async () => true),
    } as any;

    mockEmbedder = {
      generate: mock(async () => Array(2000).fill(0.01)),
    } as any;

    mockScraper = {
      scrape: mock(async () => ''),
    } as any;
  });

  function buildGraph() {
    return new ProfileGraphFactory(mockDatabase, mockEmbedder, mockScraper, { enrichUserProfile: mockEnrichUserProfile }).createGraph();
  }

  // ─────────────────────────────────────────────────────────
  // enrichUserProfile success path (prePopulatedProfile)
  // ─────────────────────────────────────────────────────────

  describe('when enrichUserProfile returns a structured profile', () => {
    const user = {
      id: 'user-enriched',
      name: 'Jane Doe',
      email: 'jane@example.com',
      socials: { linkedin: 'janedoe' },
      location: null,
      intro: null,
    };

    const enrichmentResult = {
      identity: { name: 'Jane Doe', bio: 'Senior engineer at Acme Corp', location: 'San Francisco, USA' },
      narrative: { context: 'Jane is a seasoned software engineer with 10 years of experience.' },
      attributes: { skills: ['TypeScript', 'React', 'Node.js'], interests: ['AI', 'Open Source'] },
      socials: { linkedin: 'janedoe', twitter: 'janedoe', github: 'janedoe', websites: [] },
      confidentMatch: true,
      isHuman: true,
    };

    it('should use pre-populated profile, skipping LLM generation', async () => {
      (mockDatabase.getUser as any).mockResolvedValue(user);
      mockEnrichUserProfile.mockResolvedValue(enrichmentResult);

      const graph = buildGraph();
      const result = await graph.invoke({
        userId: user.id,
        operationMode: 'generate',
      });

      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(result.profile!.identity.name).toBe('Jane Doe');
      expect(result.profile!.identity.bio).toBe('Senior engineer at Acme Corp');
      expect(result.profile!.attributes.skills).toContain('TypeScript');
      expect(mockDatabase.saveProfile).toHaveBeenCalledWith(user.id, expect.anything());
      expect(mockDatabase.updateUser).toHaveBeenCalled();
    }, 60_000);

    it('should update ghost user display name from enrichment when placeholder', async () => {
      const ghost = {
        id: 'ghost-enriched',
        name: 'jane',
        email: 'jane@example.com',
        isGhost: true,
        socials: null,
        location: null,
        intro: null,
      };
      (mockDatabase.getUser as any).mockResolvedValue(ghost);
      mockEnrichUserProfile.mockResolvedValue(enrichmentResult);

      const graph = buildGraph();
      const result = await graph.invoke({
        userId: ghost.id,
        operationMode: 'generate',
      });

      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(mockDatabase.updateUser).toHaveBeenCalledWith(
        ghost.id,
        expect.objectContaining({ name: 'Jane Doe' }),
      );
    }, 60_000);

    it('should not overwrite non-ghost user display name from enrichment', async () => {
      (mockDatabase.getUser as any).mockResolvedValue(user);
      mockEnrichUserProfile.mockResolvedValue(enrichmentResult);

      const graph = buildGraph();
      await graph.invoke({
        userId: user.id,
        operationMode: 'generate',
      });

      const updateCall = (mockDatabase.updateUser as any).mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty('name');
    }, 60_000);

    it('should generate HyDE document after enrichment', async () => {
      (mockDatabase.getUser as any).mockResolvedValue(user);
      mockEnrichUserProfile.mockResolvedValue(enrichmentResult);

      const graph = buildGraph();
      const result = await graph.invoke({
        userId: user.id,
        operationMode: 'generate',
      });

      expect(result.error).toBeUndefined();
      expect(mockDatabase.saveHydeDocument).toHaveBeenCalled();
      expect(mockEmbedder.generate).toHaveBeenCalled();
    }, 120_000);
  });

  // ─────────────────────────────────────────────────────────
  // enrichUserProfile failure fallback (LLM generation)
  // ─────────────────────────────────────────────────────────

  describe('when enrichUserProfile fails', () => {
    const user = {
      id: 'user-fallback',
      name: 'John Smith',
      email: 'john@example.com',
      socials: null,
      location: 'London',
      intro: null,
    };

    it('should fall back to LLM profile generation from basic info', async () => {
      (mockDatabase.getUser as any).mockResolvedValue(user);
      mockEnrichUserProfile.mockRejectedValue(new Error('API timeout'));

      const graph = buildGraph();
      const result = await graph.invoke({
        userId: user.id,
        operationMode: 'generate',
      });

      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(result.profile!.identity.name).toBeTruthy();
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
    }, 120_000);
  });

  describe('when enrichUserProfile returns low-signal data', () => {
    const user = {
      id: 'user-lowsignal',
      name: 'seren',
      email: 'seren@index.network',
      socials: null,
      location: null,
      intro: null,
    };

    it('should fall back to LLM generation when enrichment has empty fields', async () => {
      (mockDatabase.getUser as any).mockResolvedValue(user);
      mockEnrichUserProfile.mockResolvedValue({
        identity: { name: 'seren', bio: '', location: '' },
        narrative: { context: '' },
        attributes: { skills: [], interests: [] },
        socials: {},
        confidentMatch: true,
        isHuman: true,
      });

      const graph = buildGraph();
      const result = await graph.invoke({
        userId: user.id,
        operationMode: 'generate',
      });

      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(result.profile!.identity.name).toBeTruthy();
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
    }, 120_000);
  });

  describe('when enrichUserProfile returns confidentMatch: false', () => {
    const user = {
      id: 'user-not-confident',
      name: 'Alex Unknown',
      email: 'alex@unknown.io',
      socials: null,
      location: null,
      intro: null,
    };

    it('should fall back to LLM generation despite rich payload', async () => {
      (mockDatabase.getUser as any).mockResolvedValue(user);
      mockEnrichUserProfile.mockResolvedValue({
        identity: { name: 'Alex Unknown', bio: 'Possibly a developer.', location: 'Remote' },
        narrative: { context: 'May work in tech.' },
        attributes: { skills: ['JavaScript'], interests: ['Web'] },
        socials: {},
        confidentMatch: false,
        isHuman: true,
      });

      const graph = buildGraph();
      const result = await graph.invoke({
        userId: user.id,
        operationMode: 'generate',
      });

      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
      expect(mockDatabase.updateUser).not.toHaveBeenCalled();
    }, 120_000);
  });

  // ─────────────────────────────────────────────────────────
  // Full pipeline
  // ─────────────────────────────────────────────────────────

  describe('full pipeline produces hyde document', () => {
    const ghost = {
      id: 'ghost-pipeline',
      name: 'seren',
      email: 'seren@index.network',
      socials: null,
      location: null,
      intro: null,
    };

    it('should generate profile, embedding, and hyde document end to end', async () => {
      (mockDatabase.getUser as any).mockResolvedValue(ghost);
      mockEnrichUserProfile.mockResolvedValue(null);

      const graph = buildGraph();
      const result = await graph.invoke({
        userId: ghost.id,
        operationMode: 'generate',
      });

      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
      expect(mockEmbedder.generate).toHaveBeenCalled();
      expect(mockDatabase.saveHydeDocument).toHaveBeenCalled();
    }, 120_000);
  });
});
