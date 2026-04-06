/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, test, expect, it } from 'bun:test';
import {
  deriveRolesFromCorpus,
  canUserSeeOpportunity,
  isActionableForViewer,
  validateOpportunityActors,
} from '../opportunity.utils.js';

describe('opportunity.utils', () => {
  describe('deriveRolesFromCorpus', () => {
    test('profiles corpus: source patient, candidate agent', () => {
      const r = deriveRolesFromCorpus('profiles');
      expect(r.sourceRole).toBe('patient');
      expect(r.candidateRole).toBe('agent');
    });

    test('intents corpus: source agent, candidate patient', () => {
      const r = deriveRolesFromCorpus('intents');
      expect(r.sourceRole).toBe('agent');
      expect(r.candidateRole).toBe('patient');
    });

    test('unknown corpus: both peer', () => {
      const r = deriveRolesFromCorpus('unknown' as any);
      expect(r.sourceRole).toBe('peer');
      expect(r.candidateRole).toBe('peer');
    });
  });

  // ─── canUserSeeOpportunity ───────────────────────────────────────────────
  // Tests the Compact Visibility Rule from Latent Opportunity Lifecycle doc:
  // - Introducer or peer: always see.
  // - Patient or party: see if (status ≠ latent, or there is no introducer).
  // - Agent: see if (status ∈ {accepted, rejected, expired}, or (status ≠ latent and no introducer)).

  describe('canUserSeeOpportunity', () => {
    const STATUSES = ['latent', 'draft', 'pending', 'accepted', 'rejected', 'expired'] as const;
    const VIEWER = 'user-viewer';

    // Helper to build actors array
    const actors = (viewerRole: string, hasIntroducer: boolean) => {
      const list: Array<{ userId: string; role: string }> = [
        { userId: VIEWER, role: viewerRole },
        { userId: 'user-other', role: 'patient' },
      ];
      if (hasIntroducer && viewerRole !== 'introducer') {
        list.push({ userId: 'user-intro', role: 'introducer' });
      }
      return list;
    };

    test('returns false when user is not an actor', () => {
      const a = [{ userId: 'someone-else', role: 'patient' }];
      for (const status of STATUSES) {
        expect(canUserSeeOpportunity(a, status, VIEWER)).toBe(false);
      }
    });

    // Introducer: always sees (all statuses)
    describe('introducer', () => {
      for (const status of STATUSES) {
        test(`sees at ${status}`, () => {
          const a = [
            { userId: VIEWER, role: 'introducer' },
            { userId: 'user-b', role: 'patient' },
            { userId: 'user-c', role: 'agent' },
          ];
          expect(canUserSeeOpportunity(a, status, VIEWER)).toBe(true);
        });
      }
    });

    // Peer: always sees (all statuses)
    describe('peer', () => {
      for (const status of STATUSES) {
        test(`sees at ${status}`, () => {
          const a = [
            { userId: VIEWER, role: 'peer' },
            { userId: 'user-other', role: 'peer' },
          ];
          expect(canUserSeeOpportunity(a, status, VIEWER)).toBe(true);
        });
      }
    });

    // Patient without introducer: sees at all statuses
    describe('patient without introducer', () => {
      for (const status of STATUSES) {
        test(`sees at ${status}`, () => {
          expect(canUserSeeOpportunity(actors('patient', false), status, VIEWER)).toBe(true);
        });
      }
    });

    // Patient with introducer: cannot see at latent, can see at all others
    describe('patient with introducer', () => {
      test('cannot see at latent', () => {
        expect(canUserSeeOpportunity(actors('patient', true), 'latent', VIEWER)).toBe(false);
      });
      for (const status of ['pending', 'accepted', 'rejected', 'expired'] as const) {
        test(`sees at ${status}`, () => {
          expect(canUserSeeOpportunity(actors('patient', true), status, VIEWER)).toBe(true);
        });
      }
    });

    // Party: same as patient
    describe('party without introducer', () => {
      for (const status of STATUSES) {
        test(`sees at ${status}`, () => {
          expect(canUserSeeOpportunity(actors('party', false), status, VIEWER)).toBe(true);
        });
      }
    });

    describe('party with introducer', () => {
      test('cannot see at latent', () => {
        expect(canUserSeeOpportunity(actors('party', true), 'latent', VIEWER)).toBe(false);
      });
      for (const status of ['pending', 'accepted', 'rejected', 'expired'] as const) {
        test(`sees at ${status}`, () => {
          expect(canUserSeeOpportunity(actors('party', true), status, VIEWER)).toBe(true);
        });
      }
    });

    // Agent without introducer: cannot see at latent, can see at pending+
    describe('agent without introducer', () => {
      test('cannot see at latent', () => {
        const a = [
          { userId: VIEWER, role: 'agent' },
          { userId: 'user-other', role: 'patient' },
        ];
        expect(canUserSeeOpportunity(a, 'latent', VIEWER)).toBe(false);
      });
      for (const status of ['pending', 'accepted', 'rejected', 'expired'] as const) {
        test(`sees at ${status}`, () => {
          const a = [
            { userId: VIEWER, role: 'agent' },
            { userId: 'user-other', role: 'patient' },
          ];
          expect(canUserSeeOpportunity(a, status, VIEWER)).toBe(true);
        });
      }
    });

    // Agent with introducer: only sees at accepted/rejected/expired
    describe('agent with introducer', () => {
      for (const status of ['latent', 'pending'] as const) {
        test(`cannot see at ${status}`, () => {
          const a = [
            { userId: VIEWER, role: 'agent' },
            { userId: 'user-intro', role: 'introducer' },
            { userId: 'user-patient', role: 'patient' },
          ];
          expect(canUserSeeOpportunity(a, status, VIEWER)).toBe(false);
        });
      }
      for (const status of ['accepted', 'rejected', 'expired'] as const) {
        test(`sees at ${status}`, () => {
          const a = [
            { userId: VIEWER, role: 'agent' },
            { userId: 'user-intro', role: 'introducer' },
            { userId: 'user-patient', role: 'patient' },
          ];
          expect(canUserSeeOpportunity(a, status, VIEWER)).toBe(true);
        });
      }
    });
  });

  // ─── isActionableForViewer ───────────────────────────────────────────────
  // Tests the Home feed actionability matrix: which status × role combos
  // have a pending action (Send, Accept/Reject, Go to chat).

  describe('isActionableForViewer', () => {
    const VIEWER = 'user-viewer';

    test('returns false when user is not an actor', () => {
      const a = [{ userId: 'someone-else', role: 'patient' }];
      expect(isActionableForViewer(a, 'latent', VIEWER)).toBe(false);
    });

    // Introducer: actionable only at latent (can Send)
    describe('introducer', () => {
      test('actionable at latent', () => {
        const a = [
          { userId: VIEWER, role: 'introducer' },
          { userId: 'b', role: 'patient' },
        ];
        expect(isActionableForViewer(a, 'latent', VIEWER)).toBe(true);
      });
      for (const status of ['draft', 'pending', 'accepted', 'rejected', 'expired'] as const) {
        test(`not actionable at ${status}`, () => {
          const a = [
            { userId: VIEWER, role: 'introducer' },
            { userId: 'b', role: 'patient' },
          ];
          expect(isActionableForViewer(a, status, VIEWER)).toBe(false);
        });
      }
    });

    // Patient/party with introducer: actionable at pending (Accept/Reject)
    describe('patient with introducer', () => {
      const makeActors = () => [
        { userId: VIEWER, role: 'patient' },
        { userId: 'intro', role: 'introducer' },
        { userId: 'agent-user', role: 'agent' },
      ];
      test('not actionable at latent', () => {
        expect(isActionableForViewer(makeActors(), 'latent', VIEWER)).toBe(false);
      });
      test('actionable at pending', () => {
        expect(isActionableForViewer(makeActors(), 'pending', VIEWER)).toBe(true);
      });
      for (const status of ['draft', 'accepted', 'rejected', 'expired'] as const) {
        test(`not actionable at ${status}`, () => {
          expect(isActionableForViewer(makeActors(), status, VIEWER)).toBe(false);
        });
      }
    });

    // Patient/party without introducer: actionable at latent only (can Send)
    describe('patient without introducer', () => {
      const makeActors = () => [
        { userId: VIEWER, role: 'patient' },
        { userId: 'agent-user', role: 'agent' },
      ];
      test('actionable at latent', () => {
        expect(isActionableForViewer(makeActors(), 'latent', VIEWER)).toBe(true);
      });
      for (const status of ['draft', 'pending', 'accepted', 'rejected', 'expired'] as const) {
        test(`not actionable at ${status}`, () => {
          expect(isActionableForViewer(makeActors(), status, VIEWER)).toBe(false);
        });
      }
    });

    // Agent with introducer: actionable at accepted only (Go to chat)
    describe('agent with introducer', () => {
      const makeActors = () => [
        { userId: VIEWER, role: 'agent' },
        { userId: 'intro', role: 'introducer' },
        { userId: 'patient-user', role: 'patient' },
      ];
      test('actionable at accepted', () => {
        expect(isActionableForViewer(makeActors(), 'accepted', VIEWER)).toBe(true);
      });
      for (const status of ['latent', 'draft', 'pending', 'rejected', 'expired'] as const) {
        test(`not actionable at ${status}`, () => {
          expect(isActionableForViewer(makeActors(), status, VIEWER)).toBe(false);
        });
      }
    });

    // Agent without introducer: actionable at pending (Accept/Reject)
    describe('agent without introducer', () => {
      const makeActors = () => [
        { userId: VIEWER, role: 'agent' },
        { userId: 'patient-user', role: 'patient' },
      ];
      for (const status of ['pending'] as const) {
        test(`actionable at ${status}`, () => {
          expect(isActionableForViewer(makeActors(), status, VIEWER)).toBe(true);
        });
      }
      for (const status of ['latent', 'draft', 'accepted', 'rejected', 'expired'] as const) {
        test(`not actionable at ${status}`, () => {
          expect(isActionableForViewer(makeActors(), status, VIEWER)).toBe(false);
        });
      }
    });

    // Peer: actionable at latent, pending
    describe('peer', () => {
      const makeActors = () => [
        { userId: VIEWER, role: 'peer' },
        { userId: 'other-peer', role: 'peer' },
      ];
      for (const status of ['latent', 'pending'] as const) {
        test(`actionable at ${status}`, () => {
          expect(isActionableForViewer(makeActors(), status, VIEWER)).toBe(true);
        });
      }
      for (const status of ['draft', 'accepted', 'rejected', 'expired'] as const) {
        test(`not actionable at ${status}`, () => {
          expect(isActionableForViewer(makeActors(), status, VIEWER)).toBe(false);
        });
      }
    });
  });

  describe('validateOpportunityActors', () => {
    test('accepts 1 introducer + 1 party (1:1 intro e.g. "I want to connect with X")', () => {
      const actors = [
        { role: 'introducer' },
        { role: 'party' },
      ];
      expect(() => validateOpportunityActors(actors)).not.toThrow();
    });

    test('rejects when there is an introducer and three non-introducer actors', () => {
      const actors = [
        { role: 'introducer' },
        { role: 'party' },
        { role: 'party' },
        { role: 'party' },
      ];
      expect(() => validateOpportunityActors(actors)).toThrow(
        /An opportunity with an introducer must have one or two other actors/
      );
    });

    test('rejects when there is an introducer and zero non-introducer actors', () => {
      const actors = [{ role: 'introducer' }];
      expect(() => validateOpportunityActors(actors)).toThrow(
        /An opportunity with an introducer must have one or two other actors/
      );
    });

    test('accepts three actors: two party + one introducer', () => {
      const actors = [
        { role: 'party' },
        { role: 'party' },
        { role: 'introducer' },
      ];
      expect(() => validateOpportunityActors(actors)).not.toThrow();
    });

    test('accepts two actors: two party (no introducer)', () => {
      const actors = [
        { role: 'party' },
        { role: 'agent' },
      ];
      expect(() => validateOpportunityActors(actors)).not.toThrow();
    });

    test('accepts actors with userId', () => {
      expect(() =>
        validateOpportunityActors([
          { userId: 'c2505011-2e45-426e-81dd-b9abb9b72023', role: 'patient' },
          { userId: 'a1234567-b234-c345-d456-e56789abcdef', role: 'agent' },
        ])
      ).not.toThrow();
    });

    test('accepts actors without userId field', () => {
      expect(() =>
        validateOpportunityActors([
          { role: 'patient' },
          { role: 'agent' },
        ])
      ).not.toThrow();
    });
  });
});

// ─── Introducer-related utility tests ────────────────────────────────────────

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
