/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { z } from 'zod';
import { runScenario, defineScenario, expectSmartest } from '../../smartest.js';
import { HydeGraphFactory } from '../../src/graphs/hyde.graph.js';
import type { HydeGraphDatabase } from '../../src/interfaces/database.interface.js';
import type { EmbeddingGenerator } from '../../src/interfaces/embedder.interface.js';
import type { HydeCache } from '../../src/interfaces/cache.interface.js';
import { HydeGenerator } from '../../src/agents/hyde.generator.js';
import { LensInferrer } from '../../src/agents/lens.inferrer.js';

/** Real embedder for smartest integration tests — calls OpenRouter embeddings API. */
function createTestEmbedder(): EmbeddingGenerator {
  return {
    async generate(text: string | string[], dimensions?: number): Promise<number[] | number[][]> {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error('OPENROUTER_API_KEY required for smartest tests');
      const inputs = Array.isArray(text) ? text : [text];
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/text-embedding-3-small',
          input: inputs,
          ...(dimensions !== undefined ? { dimensions } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(`OpenRouter embeddings request failed: ${response.status} ${await response.text()}`);
      }
      const data = await response.json() as { data: Array<{ embedding: number[] }> };
      const embeddings = data.data.map(d => d.embedding);
      return inputs.length === 1 ? embeddings[0] : embeddings;
    },
  };
}

describe('HydeGraph', () => {
  let mockDatabase: HydeGraphDatabase;
  let mockEmbedder: EmbeddingGenerator;
  let mockCache: HydeCache;
  let inferrer: LensInferrer;
  let generator: HydeGenerator;

  const intentText = 'Looking for a React developer for a seed-stage startup.';
  const dummyEmbedding = [0.1, 0.2];

  beforeEach(() => {
    mockDatabase = {
      getHydeDocument: mock(async () => null),
      getHydeDocumentsForSource: mock(async () => []),
      saveHydeDocument: mock(async (data) => ({
        id: 'hyde-1',
        sourceType: data.sourceType,
        sourceId: data.sourceId ?? null,
        sourceText: data.sourceText ?? null,
        strategy: data.strategy,
        targetCorpus: data.targetCorpus,
        hydeText: data.hydeText,
        hydeEmbedding: data.hydeEmbedding,
        context: data.context ?? null,
        createdAt: new Date(),
        expiresAt: null,
      })),
      getIntent: mock(async () => null),
    } as unknown as HydeGraphDatabase;

    mockEmbedder = {
      generate: mock(async (text: string | string[]) => {
        const arr = Array.isArray(text) ? text : [text];
        return arr.length === 1 ? dummyEmbedding : arr.map(() => [...dummyEmbedding]);
      }),
    } as unknown as EmbeddingGenerator;

    const cacheStore: Record<string, unknown> = {};
    mockCache = {
      get: mock(async (key: string) => cacheStore[key] ?? null),
      set: mock(async (key: string, value: unknown) => {
        cacheStore[key] = value;
      }),
      delete: mock(async () => true),
      exists: mock(async (key: string) => key in cacheStore),
    } as unknown as HydeCache;

    inferrer = new LensInferrer();
    spyOn(inferrer, 'infer').mockResolvedValue({
      lenses: [
        { label: 'React frontend developer', corpus: 'profiles', reasoning: 'test reasoning' },
        { label: 'early-stage startup hiring', corpus: 'intents', reasoning: 'test reasoning' },
      ],
    });

    generator = new HydeGenerator();
    spyOn(generator, 'generate').mockResolvedValue({
      text: 'I am an experienced React developer looking for early-stage opportunities.',
    });
  });

  describe('E2E: Invoke with intent text returns embeddings', () => {
    it('invoke with sourceText returns hydeEmbeddings keyed by lens label', async () => {
      const factory = new HydeGraphFactory(
        mockDatabase,
        mockEmbedder,
        mockCache,
        inferrer,
        generator
      );
      const graph = factory.createGraph();

      const result = await graph.invoke({
        sourceType: 'intent',
        sourceId: 'intent-123',
        sourceText: intentText,
      });

      expect(result.error).toBeUndefined();
      expect(result.hydeEmbeddings).toBeDefined();
      expect(Object.keys(result.hydeEmbeddings ?? {}).length).toBe(2);
      expect(result.lenses).toHaveLength(2);
      expect(mockEmbedder.generate).toHaveBeenCalled();
      expect(generator.generate).toHaveBeenCalledTimes(2);
      expect(inferrer.infer).toHaveBeenCalledTimes(1);
    });
  });

  describe('E2E: Second invoke hits cache (no LLM call)', () => {
    it('second invoke with same input uses cache and does not call generator', async () => {
      const factory = new HydeGraphFactory(
        mockDatabase,
        mockEmbedder,
        mockCache,
        inferrer,
        generator
      );
      const graph = factory.createGraph();

      const input = {
        sourceType: 'intent' as const,
        sourceId: 'intent-456',
        sourceText: intentText,
      };

      await graph.invoke(input);
      expect(generator.generate).toHaveBeenCalledTimes(2);

      (generator.generate as ReturnType<typeof mock>).mockClear();

      const result2 = await graph.invoke(input);

      expect(Object.keys(result2.hydeEmbeddings ?? {}).length).toBeGreaterThan(0);
      expect(generator.generate).not.toHaveBeenCalled();
    });
  });

  describe('E2E: forceRegenerate bypasses cache', () => {
    it('forceRegenerate true skips cache and calls generator', async () => {
      const factory = new HydeGraphFactory(
        mockDatabase,
        mockEmbedder,
        mockCache,
        inferrer,
        generator
      );
      const graph = factory.createGraph();

      const input = {
        sourceType: 'intent' as const,
        sourceId: 'intent-789',
        sourceText: intentText,
        forceRegenerate: true,
      };

      const result = await graph.invoke(input);

      expect(Object.keys(result.hydeEmbeddings ?? {}).length).toBeGreaterThan(0);
      expect(generator.generate).toHaveBeenCalled();
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockDatabase.getHydeDocument).not.toHaveBeenCalled();
    });
  });

  describe('Smartest: graph with real LLM and embedder', () => {
    const hydeGraphOutputSchema = z.object({
      hydeEmbeddings: z.record(z.string(), z.array(z.number())),
      lenses: z.array(z.object({
        label: z.string(),
        corpus: z.enum(['profiles', 'intents']),
      })),
      error: z.string().optional(),
    });

    it.skipIf(!process.env.OPENROUTER_API_KEY)('invoke with intent text returns embeddings (Smartest: real LLM + embedder, schema)', async () => {
      const cacheStore: Record<string, unknown> = {};
      const mockDb: HydeGraphDatabase = {
        getHydeDocument: async () => null,
        getHydeDocumentsForSource: async () => [],
        saveHydeDocument: async (data) => ({
          id: 'hyde-1',
          sourceType: data.sourceType,
          sourceId: data.sourceId ?? null,
          sourceText: data.sourceText ?? null,
          strategy: data.strategy,
          targetCorpus: data.targetCorpus,
          hydeText: data.hydeText,
          hydeEmbedding: data.hydeEmbedding,
          context: data.context ?? null,
          createdAt: new Date(),
          expiresAt: null,
        }),
        getIntent: async () => null,
      } as HydeGraphDatabase;
      const mockCache: HydeCache = {
        get: async <T>(key: string): Promise<T | null> => (cacheStore[key] ?? null) as T | null,
        set: async (key: string, value: unknown) => {
          cacheStore[key] = value;
        },
        delete: async () => true,
        exists: async (key: string) => key in cacheStore,
      };

      const result = await runScenario(
        defineScenario({
          name: 'hyde-graph-invoke',
          description:
            'HyDE graph with real LLM and embedder: given intent text, returns embeddings and HyDE documents that are first-person and match the intent.',
          fixtures: {
            sourceText:
              'Looking for a React developer for a seed-stage startup.',
          },
          sut: {
            type: 'graph',
            factory: () => {
              const generator = new HydeGenerator();
              const inferrer = new LensInferrer();
              const embedder = createTestEmbedder();
              const factory = new HydeGraphFactory(mockDb, embedder, mockCache, inferrer, generator);
              return factory.createGraph();
            },
            invoke: async (instance, resolvedInput) => {
              const input = resolvedInput as { sourceText: string };
              return await (instance as ReturnType<HydeGraphFactory['createGraph']>).invoke({
                sourceType: 'intent',
                sourceId: 'intent-smartest',
                sourceText: input.sourceText,
              });
            },
            input: { sourceText: '@fixtures.sourceText' },
          },
          verification: {
            schema: hydeGraphOutputSchema,
            criteria:
              'hydeEmbeddings must contain at least one lens label key with a non-empty array of numbers. ' +
              'lenses must contain at least one lens with a label and corpus. ' +
              'HyDE document text should be in first person and describe an ideal match for the source intent.',
            llmVerify: false,
          },
        })
      );

      expectSmartest(result);
      const output = result.output as { hydeEmbeddings?: Record<string, number[]>; lenses?: Array<{ label: string }> };
      expect(output?.lenses).toBeDefined();
      expect((output?.lenses ?? []).length).toBeGreaterThan(0);
      const firstLensLabel = output?.lenses?.[0]?.label;
      if (firstLensLabel) {
        expect(output?.hydeEmbeddings?.[firstLensLabel]).toBeDefined();
        expect(Array.isArray(output?.hydeEmbeddings?.[firstLensLabel])).toBe(true);
      }
    }, 70000);
  });
});
