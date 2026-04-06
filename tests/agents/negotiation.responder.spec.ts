/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, it, expect } from "bun:test";
import { NegotiationResponder } from "../../src/agents/negotiation.responder.js";
import type { UserNegotiationContext, SeedAssessment, NegotiationTurn } from "../../src/states/negotiation.state.js";

const founderUser: UserNegotiationContext = {
  id: 'user-alice',
  intents: [
    { id: 'i1', title: 'Find ML co-founder', description: 'Seeking co-founder with production LLM engineering background', confidence: 0.9 },
  ],
  profile: { name: 'Alice Chen', bio: 'Product-focused founder', skills: ['product', 'fundraising'] },
};

const engineerUser: UserNegotiationContext = {
  id: 'user-bob',
  intents: [
    { id: 'i2', title: 'Join AI startup as founder', description: 'Want a founding role at an early-stage AI company', confidence: 0.88 },
  ],
  profile: { name: 'Bob Martinez', bio: 'ML Engineer specializing in LLM deployment', skills: ['PyTorch', 'LangChain', 'MLOps'] },
};

const seedAssessment: SeedAssessment = {
  score: 80,
  reasoning: 'Strong mutual need — Alice needs ML, Bob wants a founding role.',
  valencyRole: 'agent',
};

const indexContext = { networkId: 'net-1', prompt: 'AI founders and engineers' };

const proposalTurn: NegotiationTurn = {
  action: 'propose',
  assessment: {
    fitScore: 82,
    reasoning: 'Bob has exactly the LLM production expertise Alice is looking for. Their intents complement each other perfectly.',
    suggestedRoles: { ownUser: 'patient', otherUser: 'agent' },
  },
};

describe('NegotiationResponder', () => {
  const responder = new NegotiationResponder();

  it('returns a valid NegotiationTurn with action and assessment', async () => {
    const result = await responder.invoke({
      ownUser: engineerUser,
      otherUser: founderUser,
      indexContext,
      seedAssessment,
      history: [proposalTurn],
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

  it('accepts or counters a strong proposal between well-matched users', async () => {
    const result = await responder.invoke({
      ownUser: engineerUser,
      otherUser: founderUser,
      indexContext,
      seedAssessment,
      history: [proposalTurn],
    });

    expect(['accept', 'counter']).toContain(result.action);
  }, 60000);

  it('rejects or counters a proposal for a poor match with low seed score', async () => {
    const unrelatedUser: UserNegotiationContext = {
      id: 'user-dave',
      intents: [{ id: 'i3', title: 'Find plumber', description: 'Need a licensed plumber for home renovation', confidence: 0.95 }],
      profile: { name: 'Dave Smith', bio: 'Homeowner renovating kitchen', skills: [] },
    };

    const poorSeed: SeedAssessment = { score: 8, reasoning: 'No overlap whatsoever.', valencyRole: 'peer' };

    const weakProposal: NegotiationTurn = {
      action: 'propose',
      assessment: {
        fitScore: 10,
        reasoning: 'Both are looking for something, so maybe there is a connection.',
        suggestedRoles: { ownUser: 'peer', otherUser: 'peer' },
      },
    };

    const result = await responder.invoke({
      ownUser: engineerUser,
      otherUser: unrelatedUser,
      indexContext,
      seedAssessment: poorSeed,
      history: [weakProposal],
    });

    expect(result.assessment.fitScore).toBeLessThan(50);
  }, 60000);
});
