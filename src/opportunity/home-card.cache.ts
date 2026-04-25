import type { Cache } from '../shared/interfaces/cache.interface.js';
import type { OpportunityPresenter, PresenterDatabase } from './opportunity.presenter.js';
import { gatherPresenterContext } from './opportunity.presenter.js';

export interface HomeCardItem {
  opportunityId: string;
  headline: string;
  personalizedSummary: string;
  suggestedAction: string;
  narratorRemark: string;
}

export interface OpportunityWithContext {
  id: string;
  status: string;
  actors: Array<{ userId: string; role: string }>;
  interpretation?: unknown;
  detection?: unknown;
}

export const HOME_CARD_CACHE_TTL = 24 * 60 * 60; // 24 hours

export async function getOrCreateHomeCardBatch(
  cache: Cache,
  presenter: OpportunityPresenter,
  presenterDb: PresenterDatabase,
  opportunities: OpportunityWithContext[],
  viewerId: string,
  options?: { ttl?: number }
): Promise<Map<string, HomeCardItem>> {
  if (opportunities.length === 0) {
    return new Map();
  }

  const ttl = options?.ttl ?? HOME_CARD_CACHE_TTL;
  const keys = opportunities.map(
    (opp) => `home:card:${opp.id}:${opp.status}:${viewerId}`
  );
  const cached = await cache.mget<HomeCardItem>(keys);

  const result = new Map<string, HomeCardItem>();
  const misses: Array<{ opp: OpportunityWithContext; index: number }> = [];

  for (let i = 0; i < opportunities.length; i++) {
    const item = cached[i];
    if (item) {
      result.set(opportunities[i].id, item);
    } else {
      misses.push({ opp: opportunities[i], index: i });
    }
  }

  // Generate cards for cache misses
  await Promise.all(
    misses.map(async ({ opp, index }) => {
      const presenterInput = await gatherPresenterContext(
        presenterDb,
        opp as Parameters<typeof gatherPresenterContext>[1],
        viewerId
      );
      presenterInput.opportunityStatus = opp.status;

      const presented = await presenter.presentHomeCard(presenterInput);
      const card: HomeCardItem = {
        opportunityId: opp.id,
        headline: presented.headline,
        personalizedSummary: presented.personalizedSummary,
        suggestedAction: presented.suggestedAction,
        narratorRemark: presented.narratorRemark,
      };

      result.set(opp.id, card);

      // Cache the result
      await cache.set(keys[index], card, { ttl });
    })
  );

  return result;
}
