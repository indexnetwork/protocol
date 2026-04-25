import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateHomeCardBatch } from './home-card.cache.js';
import type { OpportunityPresenter } from './opportunity.presenter.js';
import type { PresenterDatabase } from './opportunity.presenter.js';
import type { Cache } from '../shared/interfaces/cache.interface.js';

describe('getOrCreateHomeCardBatch', () => {
  let mockCache: Cache;
  let mockPresenter: OpportunityPresenter;
  let mockPresenterDb: PresenterDatabase;

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      mget: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      deleteByPattern: vi.fn(),
    };
    mockPresenter = {
      presentHomeCard: vi.fn(),
    } as unknown as OpportunityPresenter;
    mockPresenterDb = {
      getProfile: vi.fn(),
      getActiveIntents: vi.fn(),
      getNetwork: vi.fn(),
    } as unknown as PresenterDatabase;
  });

  it('returns cached card without calling presenter on cache hit', async () => {
    const cachedCard = {
      opportunityId: 'opp-1',
      headline: 'Cached headline',
      personalizedSummary: 'Cached summary',
      suggestedAction: 'Cached action',
      narratorRemark: 'Cached remark',
    };
    (mockCache.mget as any).mockResolvedValue([cachedCard]);

    const opportunities = [{ id: 'opp-1', status: 'pending', actors: [] }];
    const result = await getOrCreateHomeCardBatch(
      mockCache,
      mockPresenter,
      mockPresenterDb,
      opportunities as any,
      'user-1'
    );

    expect(result.get('opp-1')).toEqual(cachedCard);
    expect(mockPresenter.presentHomeCard).not.toHaveBeenCalled();
    expect(mockCache.mget).toHaveBeenCalledWith(['home:card:opp-1:pending:user-1']);
  });
});
