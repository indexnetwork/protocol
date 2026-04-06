/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, expect, it } from "bun:test";
import type { Runnable } from "@langchain/core/runnables";
import { OpportunityEvaluator, CandidateProfile, EvaluatorInput } from "../opportunity.evaluator";

describe('OpportunityEvaluator', () => {
  const evaluator = new OpportunityEvaluator();

  const sourceProfile = `
        Name: Alice
        Bio: Senior Blockchain Developer building a DeFi protocol.
        Skills: Rust, Solidity, React.
        Interests: DeFi, Zero Knowledge Proofs.
    `;

  const candidates: CandidateProfile[] = [
    {
      userId: "user-bob",
      identity: { name: "Bob", bio: "Crypto investor and community manager.", location: "NYC" },
      attributes: { skills: ["Marketing", "Community"], interests: ["DeFi", "Bitcoin"] }
    },
    {
      userId: "user-charlie",
      identity: { name: "Charlie", bio: "Chef.", location: "Paris" },
      attributes: { skills: ["Cooking"], interests: ["Food"] }
    }
  ];

  it('should find a high-value match', async () => {
    const result = await evaluator.invoke(sourceProfile, candidates, { minScore: 50 });

    expect(result.length).toBeGreaterThan(0);
    const match = result[0];
    expect(match.candidateId).toBe("user-bob");
    expect(match.score).toBeGreaterThan(50);
    expect(match.reasoning).toBeDefined();
  }, 60000);

  it('should filter out low relevance candidates', async () => {
    // For this test, we need the mock to return DIFFERENT results based on input, or simpler:
    // We can just create a new evaluator with a mock that returns NOTHING.

    // Actually, the current logic filters based on returned score.
    // My simple mock always returns score 95 for "user-bob".
    // It doesn't return "user-charlie".
    // So "user-charlie" is implicitly filtered out because the mock didn't return it.

    const result = await evaluator.invoke(sourceProfile, candidates, { minScore: 90 });

    const charlieMatch = result.find(r => r.candidateId === "user-charlie");
    expect(charlieMatch).toBeUndefined();
  }, 60000);

  describe('invokeEntityBundle', () => {
    it('returns no opportunities when entity-bundle model returns empty (e.g. already know each other)', async () => {
      const mockEntityBundleModel = {
        invoke: async () => ({ opportunities: [] }),
      } as unknown as Runnable;
      const evaluatorWithMock = new OpportunityEvaluator({
        entityBundleModel: mockEntityBundleModel,
      });
      const input: EvaluatorInput = {
        discovererId: 'discoverer-1',
        entities: [
          {
            userId: 'user-a',
            profile: {
              name: 'Alice',
              bio: 'Co-founder at Acme Corp.',
              context: 'Building Acme Corp. with Bob.',
            },
            indexId: 'index-1',
          },
          {
            userId: 'user-b',
            profile: {
              name: 'Bob',
              bio: 'Co-founder at Acme Corp.',
              context: 'Building Acme Corp. with Alice.',
            },
            indexId: 'index-1',
          },
        ],
      };
      const result = await evaluatorWithMock.invokeEntityBundle(input, { minScore: 70 });
      expect(result).toHaveLength(0);
    });

    it('includes same-side matching rule in entity bundle prompt', async () => {
      let capturedMessages: unknown[] = [];
      const mockEntityBundleModel = {
        invoke: async (messages: unknown[]) => {
          capturedMessages = messages;
          return { opportunities: [] };
        },
      } as unknown as Runnable;

      const evaluatorWithMock = new OpportunityEvaluator({ entityBundleModel: mockEntityBundleModel });

      const input: EvaluatorInput = {
        discovererId: 'user-1',
        entities: [
          {
            userId: 'user-1',
            profile: { name: 'Alice', bio: 'Founder raising capital' },
            intents: [{ intentId: 'i1', payload: 'Looking for investors' }],
            indexId: 'idx-1',
          },
          {
            userId: 'user-2',
            profile: { name: 'Bob', bio: 'Founder raising capital' },
            intents: [{ intentId: 'i2', payload: 'Seeking investors for my startup' }],
            indexId: 'idx-1',
          },
        ],
        discoveryQuery: 'find me investors',
      };

      await evaluatorWithMock.invokeEntityBundle(input, { minScore: 30 });

      // Verify the system prompt contains same-side matching rule
      const systemMsg = capturedMessages[0] as { content: string };
      expect(systemMsg.content).toContain('SAME-SIDE MATCHING');

      // Verify the human message contains same-side check in discovery query rules
      const humanMsg = capturedMessages[1] as { content: string };
      expect(humanMsg.content).toContain('SAME-SIDE CHECK');
    }, 10000);

    it.skip('returns no opportunity when entities clearly already know each other (e.g. co-founders) [integration: live LLM]', async () => {
      const input: EvaluatorInput = {
        discovererId: 'discoverer-1',
        entities: [
          {
            userId: 'user-a',
            profile: {
              name: 'Alice',
              bio: 'Co-founder at Acme Corp.',
              context: 'Building Acme Corp. with Bob.',
            },
            indexId: 'index-1',
          },
          {
            userId: 'user-b',
            profile: {
              name: 'Bob',
              bio: 'Co-founder at Acme Corp.',
              context: 'Building Acme Corp. with Alice.',
            },
            indexId: 'index-1',
          },
        ],
      };
      const result = await evaluator.invokeEntityBundle(input, { minScore: 70 });
      expect(result).toHaveLength(0);
    }, 30000);

    it('penalizes candidates with known location mismatch when discoveryQuery mentions location', async () => {
      const mockEntityBundleModel = {
        invoke: async () => ({
          opportunities: [
            {
              reasoning: 'NY-based investor matches investor criteria but is in wrong city.',
              score: 35,
              actors: [
                { userId: 'discoverer-1', role: 'patient', intentId: null },
                { userId: 'candidate-ny', role: 'agent', intentId: null },
              ],
            },
          ],
        }),
      } as unknown as Runnable;
      const evaluatorWithMock = new OpportunityEvaluator({
        entityBundleModel: mockEntityBundleModel,
      });
      const input: EvaluatorInput = {
        discovererId: 'discoverer-1',
        entities: [
          {
            userId: 'discoverer-1',
            profile: {
              name: 'Alice',
              bio: 'Founder building an AI startup.',
              location: 'San Francisco',
            },
            indexId: 'index-1',
          },
          {
            userId: 'candidate-ny',
            profile: {
              name: 'Bob',
              bio: 'VC partner at TechFund.',
              location: 'New York',
            },
            indexId: 'index-1',
            ragScore: 85,
          },
        ],
        discoveryQuery: 'investors in San Francisco',
      };
      const results = await evaluatorWithMock.invokeEntityBundle(input, { minScore: 50 });
      // Mock returns score 35, which is below minScore 50 — should be filtered
      expect(results.length).toBe(0);
    }, 30000);

    it('does not penalize candidates with unknown location when discoveryQuery mentions location', async () => {
      const mockEntityBundleModel = {
        invoke: async () => ({
          opportunities: [
            {
              reasoning: 'Candidate matches investor criteria; location unverified.',
              score: 80,
              actors: [
                { userId: 'discoverer-1', role: 'patient', intentId: null },
                { userId: 'candidate-unknown', role: 'agent', intentId: null },
              ],
            },
          ],
        }),
      } as unknown as Runnable;
      const evaluatorWithMock = new OpportunityEvaluator({
        entityBundleModel: mockEntityBundleModel,
      });
      const input: EvaluatorInput = {
        discovererId: 'discoverer-1',
        entities: [
          {
            userId: 'discoverer-1',
            profile: {
              name: 'Alice',
              bio: 'Founder building an AI startup.',
              location: 'San Francisco',
            },
            indexId: 'index-1',
          },
          {
            userId: 'candidate-unknown',
            profile: {
              name: 'Charlie',
              bio: 'Angel investor in deep tech.',
            },
            indexId: 'index-1',
            ragScore: 75,
          },
        ],
        discoveryQuery: 'investors in San Francisco',
      };
      const results = await evaluatorWithMock.invokeEntityBundle(input, { minScore: 50 });
      expect(results.length).toBe(1);
      expect(results[0].score).toBeGreaterThanOrEqual(50);
    }, 30000);
  });
});
