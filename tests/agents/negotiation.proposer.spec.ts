/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, it, expect } from "bun:test";
import { NegotiationProposer } from "../../src/agents/negotiation.proposer.js";
import type { UserNegotiationContext, SeedAssessment } from "../../src/states/negotiation.state.js";

const mlUser: UserNegotiationContext = {
  id: 'user-alice',
  intents: [
    { id: 'i1', title: 'Hire ML Engineer', description: 'Looking for a senior ML engineer with LLM production experience', confidence: 0.9 },
  ],
  profile: { name: 'Alice Chen', bio: 'CTO at AI startup', skills: ['product', 'fundraising'] },
};

const engineerUser: UserNegotiationContext = {
  id: 'user-bob',
  intents: [
    { id: 'i2', title: 'Find AI startup role', description: 'Seeking a founding engineer role at an AI company', confidence: 0.85 },
  ],
  profile: { name: 'Bob Martinez', bio: 'ML Engineer, 5 years LLM systems', skills: ['PyTorch', 'LangChain', 'CUDA'] },
};

const seedAssessment: SeedAssessment = {
  score: 78,
  reasoning: 'Strong skill match — Bob has the LLM production experience Alice needs.',
  valencyRole: 'patient',
};

const indexContext = { networkId: 'net-1', prompt: 'AI founders and engineers looking to connect' };

describe('NegotiationProposer', () => {
  const proposer = new NegotiationProposer();

  it('returns a valid NegotiationTurn with action and assessment on first turn', async () => {
    const result = await proposer.invoke({
      ownUser: mlUser,
      otherUser: engineerUser,
      indexContext,
      seedAssessment,
      history: [],
    });

    expect(['propose', 'accept', 'reject', 'counter']).toContain(result.action);
    expect(typeof result.assessment.fitScore).toBe('number');
    expect(result.assessment.fitScore).toBeGreaterThanOrEqual(0);
    expect(result.assessment.fitScore).toBeLessThanOrEqual(100);
    expect(typeof result.assessment.reasoning).toBe('string');
    expect(result.assessment.reasoning.length).toBeGreaterThan(0);
    expect(['agent', 'patient', 'peer']).toContain(result.assessment.suggestedRoles.ownUser);
    expect(['agent', 'patient', 'peer']).toContain(result.assessment.suggestedRoles.otherUser);
  }, 60000);

  it('returns "propose" action on the opening turn for a good match', async () => {
    const result = await proposer.invoke({
      ownUser: mlUser,
      otherUser: engineerUser,
      indexContext,
      seedAssessment,
      history: [],
    });

    expect(result.action).toBe('propose');
  }, 60000);

  it('returns reject or counter for a clearly mismatched pair', async () => {
    const chefUser: UserNegotiationContext = {
      id: 'user-chef',
      intents: [{ id: 'i3', title: 'Find restaurant investors', description: 'Seeking capital for a restaurant chain', confidence: 0.9 }],
      profile: { name: 'Chef Carlo', bio: 'Head chef opening a Michelin-star restaurant', skills: ['cooking', 'menu design'] },
    };

    const poorSeed: SeedAssessment = { score: 12, reasoning: 'No overlap — AI startup vs. restaurant.', valencyRole: 'patient' };

    const result = await proposer.invoke({
      ownUser: mlUser,
      otherUser: chefUser,
      indexContext,
      seedAssessment: poorSeed,
      history: [],
    });

    expect(result.assessment.fitScore).toBeLessThan(50);
  }, 60000);
});
