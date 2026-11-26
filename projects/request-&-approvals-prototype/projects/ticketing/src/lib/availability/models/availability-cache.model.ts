import type { DatesAvailabilityQuery, SessionAvailabilityForDateQuery } from './availability-query.model';

export interface DatesAvailabilityCacheKey {
  query: DatesAvailabilityQuery;
  ttlSeconds?: number;
}

export interface SessionAvailabilityForDateCacheKey {
  query: SessionAvailabilityForDateQuery;
  contentLanguage?: string;
  ttlSeconds?: number;
  /** Selects the stale-while-revalidate flow of `readSessionsForDate`; never part of the cache key. */
  useSwr?: boolean;
}

export interface AvailabilityCacheEmission<TValue> {
  readonly isStale: boolean;
  readonly value: TValue;
}
