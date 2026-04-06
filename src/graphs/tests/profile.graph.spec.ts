/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ProfileGraphFactory } from '../profile.graph.js';
import { ProfileGraphDatabase } from '../../interfaces/database.interface.js';
import { Embedder } from '../../interfaces/embedder.interface.js';
import { Scraper } from '../../interfaces/scraper.interface.js';
import { ProfileDocument } from '../../agents/profile.generator.js';

describe('ProfileGraph', () => {
  let factory: ProfileGraphFactory;
  let mockDatabase: ProfileGraphDatabase;
  let mockEmbedder: Embedder;
  let mockScraper: Scraper;

  const mockProfile: ProfileDocument = {
    userId: 'test-user-id',
    identity: {
      name: 'Test User',
      bio: 'A test user bio',
      location: 'Test City, Test Country'
    },
    narrative: {
      context: 'Test user is working on testing things'
    },
    attributes: {
      interests: ['testing', 'coding'],
      skills: ['TypeScript', 'Testing']
    },
    embedding: [0.1, 0.2, 0.3] as any
  };

  beforeEach(() => {
    // Mock database
    mockDatabase = {
      getProfile: mock(async (userId: string) => null),
      getProfileByUserId: mock(async (userId: string) => null),
      getUser: mock(async (userId: string) => ({
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        socials: {}
      })),
      updateUser: mock(async (userId: string, data: any) => ({
        id: userId,
        name: data.name ?? 'Test User',
        email: 'test@example.com',
        socials: data.socials ?? {},
        location: data.location ?? null,
      })),
      saveProfile: mock(async () => {}),
      getHydeDocument: mock(async () => null),
      saveHydeDocument: mock(async () => ({ id: 'mock-hyde-doc-id' })),
      softDeleteGhost: mock(async () => true),
    } as any;

    // Mock embedder
    mockEmbedder = {
      generate: mock(async (text: string) => [0.1, 0.2, 0.3])
    } as any;

    // Mock scraper
    mockScraper = {
      scrape: mock(async (objective: string) => 'Scraped data about the user')
    } as any;

    factory = new ProfileGraphFactory(mockDatabase, mockEmbedder, mockScraper);
  });

  describe('Query Mode (Fast Path)', () => {
    it('should return existing profile without generation in query mode', async () => {
      // Setup: Profile exists in DB
      (mockDatabase.getProfile as any).mockResolvedValue(mockProfile);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'query'
      });

      expect(result.profile).toEqual(mockProfile);
      expect(mockDatabase.getProfile).toHaveBeenCalledWith('test-user-id');
      
      // Should NOT call generation methods in query mode
      expect(mockEmbedder.generate).not.toHaveBeenCalled();
      expect(mockScraper.scrape).not.toHaveBeenCalled();
    });

    it('should return undefined in query mode when profile does not exist', async () => {
      // Setup: No profile in DB
      (mockDatabase.getProfile as any).mockResolvedValue(null);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'query'
      });

      expect(result.profile).toBeUndefined();
      
      // Should NOT attempt to generate profile in query mode
      expect(mockScraper.scrape).not.toHaveBeenCalled();
      expect(mockEmbedder.generate).not.toHaveBeenCalled();
    });
  });

  describe('Write Mode - Conditional Generation', () => {
    it('should generate profile when missing', async () => {
      // Setup: No profile exists
      (mockDatabase.getProfile as any).mockResolvedValue(null);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write',
        input: 'Test user information'
      });

      expect(result.profile).toBeDefined();
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
      expect(mockEmbedder.generate).toHaveBeenCalled();
    });

    it('should only generate embedding when profile exists but embedding is missing', async () => {
      // Setup: Profile exists but no embedding
      const profileWithoutEmbedding = {
        ...mockProfile,
        embedding: [] as any
      };
      (mockDatabase.getProfile as any).mockResolvedValue(profileWithoutEmbedding);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should generate embedding but not regenerate profile
      expect(mockEmbedder.generate).toHaveBeenCalled();
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
      
      // Should NOT scrape or regenerate profile content
      expect(mockScraper.scrape).not.toHaveBeenCalled();
    });

    it('should only generate hyde when profile exists but hyde is missing', async () => {
      // Setup: Profile with embedding exists, but no hyde document
      const profileWithEmbedding = {
        ...mockProfile,
        embedding: [0.1, 0.2, 0.3] as any,
      };
      (mockDatabase.getProfile as any).mockResolvedValue(profileWithEmbedding);
      (mockDatabase.getHydeDocument as any).mockResolvedValue(null);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should generate hyde and its embedding
      expect(mockEmbedder.generate).toHaveBeenCalled();
      expect(mockDatabase.saveHydeDocument).toHaveBeenCalled();
      
      // Should NOT regenerate profile
      expect(mockDatabase.saveProfile).not.toHaveBeenCalled();
    });

    it('should generate and save hyde when no hyde document exists', async () => {
      // Setup: Profile exists with embedding, but no hyde document
      const profileWithEmbedding = {
        ...mockProfile,
        embedding: [0.1, 0.2, 0.3] as any,
      };
      (mockDatabase.getProfile as any).mockResolvedValue(profileWithEmbedding);
      (mockDatabase.getHydeDocument as any).mockResolvedValue(null);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should generate hyde and save to hyde_documents
      expect(mockEmbedder.generate).toHaveBeenCalled();
      expect(mockDatabase.saveHydeDocument).toHaveBeenCalled();
      expect(mockDatabase.saveProfile).not.toHaveBeenCalled();
    });

    it('should do nothing when all components exist', async () => {
      // Setup: Complete profile and existing hyde document
      const completeProfile = {
        ...mockProfile,
        embedding: [0.1, 0.2, 0.3] as any,
      };
      (mockDatabase.getProfile as any).mockResolvedValue(completeProfile);
      (mockDatabase.getHydeDocument as any).mockResolvedValue({
        hydeText: 'Existing hyde description',
        hydeEmbedding: [0.4, 0.5, 0.6],
      });

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should return existing profile without any generation
      expect(result.profile).toEqual(completeProfile);
      expect(mockEmbedder.generate).not.toHaveBeenCalled();
      expect(mockDatabase.saveProfile).not.toHaveBeenCalled();
      expect(mockDatabase.saveHydeDocument).not.toHaveBeenCalled();
    });
  });

  describe('Force Update Behavior', () => {
    it('should regenerate profile and hyde when forceUpdate is true with new input', async () => {
      // Setup: Complete profile and hyde doc exist
      const existingProfile = {
        ...mockProfile,
        embedding: [0.1, 0.2, 0.3] as any,
      };
      (mockDatabase.getProfile as any).mockResolvedValue(existingProfile);
      (mockDatabase.getHydeDocument as any).mockResolvedValue({
        hydeText: 'Old hyde description',
        hydeEmbedding: [0.4, 0.5, 0.6],
      });

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write',
        forceUpdate: true,
        input: 'New information about the user'
      });

      // Should regenerate profile
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
      
      // Should also regenerate hyde (because profile was updated)
      expect(mockDatabase.saveHydeDocument).toHaveBeenCalled();
      
      // Should generate embeddings for both
      expect(mockEmbedder.generate).toHaveBeenCalled();
    });

    it('should regenerate hyde when profile is updated', async () => {
      // Setup: Profile exists but needs update
      (mockDatabase.getProfile as any).mockResolvedValue(null);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write',
        input: 'New profile information'
      });

      // When profile is generated, hyde should be regenerated too
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
      expect(mockDatabase.saveHydeDocument).toHaveBeenCalled();
    });
  });

  describe('Scraping Behavior', () => {
    it('should scrape when no input is provided', async () => {
      // Setup: No profile, no input
      (mockDatabase.getProfile as any).mockResolvedValue(null);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should call scraper to get input
      expect(mockScraper.scrape).toHaveBeenCalled();
      
      // Should then generate profile
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
    });

    it('should skip scraping when input is provided', async () => {
      // Setup: No profile, but input provided
      (mockDatabase.getProfile as any).mockResolvedValue(null);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write',
        input: 'Provided profile information'
      });

      // Should NOT call scraper
      expect(mockScraper.scrape).not.toHaveBeenCalled();
      
      // Should generate profile from provided input
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
    });
  });

  describe('User Information Detection', () => {
    it('should detect missing user information when no socials and incomplete name', async () => {
      // Setup: No profile, user has only email
      (mockDatabase.getProfile as any).mockResolvedValue(null);
      (mockDatabase.getUser as any).mockResolvedValue({
        id: 'test-user-id',
        name: 'test@example.com', // Just email as name
        email: 'test@example.com',
        socials: null // No socials
      });

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
        // No input - would need scraping
      });

      // Should detect missing user info
      expect(result.needsUserInfo).toBe(true);
      expect(result.missingUserInfo).toContain('social_urls');
      expect(result.missingUserInfo).toContain('full_name');
      
      // Should NOT attempt to scrape
      expect(mockScraper.scrape).not.toHaveBeenCalled();
      
      // Should NOT generate profile
      expect(mockDatabase.saveProfile).not.toHaveBeenCalled();
    });

    it('should proceed with scraping when user has social URLs', async () => {
      // Setup: No profile, user has social URLs
      (mockDatabase.getProfile as any).mockResolvedValue(null);
      (mockDatabase.getUser as any).mockResolvedValue({
        id: 'test-user-id',
        name: 'Test',
        email: 'test@example.com',
        socials: {
          x: 'https://x.com/testuser',
          linkedin: 'https://linkedin.com/in/testuser'
        }
      });

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should NOT detect missing user info
      expect(result.needsUserInfo).toBe(false);
      
      // Should proceed with scraping
      expect(mockScraper.scrape).toHaveBeenCalled();
    });

    it('should proceed with scraping when user has meaningful name', async () => {
      // Setup: No profile, user has full name
      (mockDatabase.getProfile as any).mockResolvedValue(null);
      (mockDatabase.getUser as any).mockResolvedValue({
        id: 'test-user-id',
        name: 'John Doe', // Full name
        email: 'test@example.com',
        socials: null,
        location: 'San Francisco, CA'
      });

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should NOT detect missing user info
      expect(result.needsUserInfo).toBe(false);
      
      // Should proceed with scraping
      expect(mockScraper.scrape).toHaveBeenCalled();
    });

    it('should not check user info when input is provided', async () => {
      // Setup: No profile, insufficient user info, but input provided
      (mockDatabase.getProfile as any).mockResolvedValue(null);
      (mockDatabase.getUser as any).mockResolvedValue({
        id: 'test-user-id',
        name: 'Test',
        email: 'test@example.com',
        socials: null
      });

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write',
        input: 'User provided profile data'
      });

      // Should NOT detect missing user info (because input was provided)
      expect(result.needsUserInfo).toBe(false);
      
      // Should NOT scrape
      expect(mockScraper.scrape).not.toHaveBeenCalled();
      
      // Should generate profile from input
      expect(mockDatabase.saveProfile).toHaveBeenCalled();
    });

    it('should not check user info when profile already exists', async () => {
      // Setup: Profile exists
      (mockDatabase.getProfile as any).mockResolvedValue(mockProfile);

      const graph = factory.createGraph();
      const result = await graph.invoke({
        userId: 'test-user-id',
        operationMode: 'write'
      });

      // Should NOT detect missing user info (profile exists)
      expect(result.needsUserInfo).toBe(false);
      
      // Should NOT scrape (not needed)
      expect(mockScraper.scrape).not.toHaveBeenCalled();
    });
  });
});
