import type { SessionAvailabilityForDateCacheKey } from '../models/availability-cache.model';
import type { AvailabilityFetchContext } from '../models/availability-fetch.model';
import type { SessionAvailabilityForDateQuery } from '../models/availability-query.model';
import type { SessionAvailabilitySummary } from '../models/session-availability-summary.model';
import type { SessionsForDateFetch } from '../models/sessions-for-date-fetch.model';
import type { SessionsForDateWindow } from '../models/sessions-for-date-window.model';
import { buildSessionsForDateWindow, buildSessionStartWindow } from './build-sessions-for-date-window.util';

export function fetchOfDay(fetch: SessionsForDateFetch, fromDate: string): SessionsForDateFetch {
  return {
    ...fetch,
    queries: fetch.queries.map((query: SessionAvailabilityForDateQuery): SessionAvailabilityForDateQuery => ({ ...query, fromDate })),
  };
}

export function mergeSummaries(fetch: SessionsForDateFetch, summaries: readonly SessionAvailabilitySummary[]): SessionAvailabilitySummary {
  return fetch.merge === undefined ? summaries[0] : fetch.merge(summaries);
}

export function toCacheKey(fetch: SessionsForDateFetch, query: SessionAvailabilityForDateQuery): SessionAvailabilityForDateCacheKey {
  return {
    contentLanguage: fetch.cache.contentLanguage,
    query,
    ttlSeconds: fetch.cache.ttlSeconds,
    useSwr: fetch.cache.useSwr,
  };
}

export function toDayKey(fetch: SessionsForDateFetch): string {
  return JSON.stringify(fetch.queries.map((query: SessionAvailabilityForDateQuery) => toCacheKey(fetch, query)));
}

export function toFetchContext(fetch: SessionsForDateFetch): AvailabilityFetchContext {
  const [{ partnerId, planId }] = fetch.queries;

  return { isFastLoad: fetch.cache.useSwr, partnerId, planId };
}

export function toSearchKey(fetch: SessionsForDateFetch): string {
  return toDayKey(fetchOfDay(fetch, ''));
}

export function toSessionsForDateWindow(fetch: SessionsForDateFetch): SessionsForDateWindow | null {
  const [{ fromDate, timezone }] = fetch.queries;
  const sessionStartWindow =
    fetch.modifyOrderSessionStartsAt === undefined
      ? null
      : buildSessionStartWindow(fromDate, timezone, Date.parse(fetch.modifyOrderSessionStartsAt));

  return sessionStartWindow ?? buildSessionsForDateWindow(fromDate, timezone, Date.now());
}

export function usesCache(fetch: SessionsForDateFetch): boolean {
  return fetch.cache.useCache || fetch.cache.useSwr;
}
