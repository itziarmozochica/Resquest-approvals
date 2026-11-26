import { inject, untracked, type Signal } from '@angular/core';

import { signalStoreFeature, type, withHooks, withMethods } from '@ngrx/signals';
import {
  catchError,
  combineLatest,
  concat,
  connectable,
  defer,
  EMPTY,
  finalize,
  last,
  map,
  of,
  ReplaySubject,
  share,
  Subscription,
  type Observable,
} from 'rxjs';

import type { AvailabilityCacheEmission } from '../models/availability-cache.model';
import type { AvailabilityFetchOptimisation } from '../models/availability-fetch.model';
import type { SessionAvailabilityForDateQuery } from '../models/availability-query.model';
import type { DateAvailability } from '../models/date-availability.model';
import type { SessionAvailabilitySummary } from '../models/session-availability-summary.model';
import type {
  SessionsForDateEmission,
  SessionsForDateFetch,
  SessionsForDatePrefetch,
  SessionsForDatePreload,
  SessionsForDatePreloadedDay,
} from '../models/sessions-for-date-fetch.model';
import type { SessionsForDateWindow } from '../models/sessions-for-date-window.model';
import { AvailabilityCacheService } from '../services/availability-cache.service';
import { TicketingAvailabilityService } from '../services/availability.service';
import { TICKETING_AVAILABILITY_FETCH } from '../tokens/availability-fetch-config.token';
import { pickFollowingDays } from '../utils/pick-following-days.util';
import { raceWindowAndWholeDay, type SessionsForDateRaceEmission } from '../utils/race-window-and-whole-day.util';
import {
  fetchOfDay,
  mergeSummaries,
  toCacheKey,
  toDayKey,
  toFetchContext,
  toSearchKey,
  toSessionsForDateWindow,
  usesCache,
} from '../utils/sessions-for-date-fetch.util';

type SessionsForDateCacheEmission = AvailabilityCacheEmission<SessionAvailabilitySummary>;

const PRELOADED_FOLLOWING_DAYS = 3;

const eagerSessionsFeature = signalStoreFeature(
  { props: type<{ dates: Signal<readonly DateAvailability[]> }>() },
  withMethods(
    (
      store,
      availabilityService = inject(TicketingAvailabilityService),
      cache = inject(AvailabilityCacheService),
      gates = inject(TICKETING_AVAILABILITY_FETCH, { optional: true }),
    ) => {
      const preloads = new Map<string, SessionsForDatePreloadedDay>();
      let preloadSearchKey: string | null = null;

      function isEager(fetch: SessionsForDateFetch, optimisation: AvailabilityFetchOptimisation): boolean {
        return gates?.[optimisation]?.(toFetchContext(fetch)) ?? true;
      }

      function hasWholeDay(fetch: SessionsForDateFetch): boolean {
        return (
          usesCache(fetch) &&
          fetch.queries.every((query: SessionAvailabilityForDateQuery) => cache.getSessionsForDate(toCacheKey(fetch, query)) !== null)
        );
      }

      function isFetchingWholeDay(fetch: SessionsForDateFetch): boolean {
        return fetch.queries.every((query: SessionAvailabilityForDateQuery) => cache.isFetchingSessionsForDate(toCacheKey(fetch, query)));
      }

      function readQuery(fetch: SessionsForDateFetch, query: SessionAvailabilityForDateQuery): Observable<SessionsForDateCacheEmission> {
        const key = toCacheKey(fetch, query);
        const request = (): Observable<SessionAvailabilitySummary> => availabilityService.getSessionAvailabilityForDate(query);

        if (!usesCache(fetch)) {
          return cache
            .fetchSessionsForDate(key, request)
            .pipe(map((value: SessionAvailabilitySummary): SessionsForDateCacheEmission => ({ isStale: false, value })));
        }

        return cache.readSessionsForDate(key, request);
      }

      function read(
        fetch: SessionsForDateFetch,
        queries: readonly SessionAvailabilityForDateQuery[],
      ): Observable<SessionsForDateCacheEmission> {
        if (queries.length === 1) {
          return readQuery(fetch, queries[0]);
        }

        return combineLatest(queries.map((query: SessionAvailabilityForDateQuery) => readQuery(fetch, query))).pipe(
          map(
            (emissions: SessionsForDateCacheEmission[]): SessionsForDateCacheEmission => ({
              isStale: emissions.some((emission: SessionsForDateCacheEmission) => emission.isStale),
              value: mergeSummaries(
                fetch,
                emissions.map((emission: SessionsForDateCacheEmission) => emission.value),
              ),
            }),
          ),
        );
      }

      function fetchWholeDay(fetch: SessionsForDateFetch): Observable<SessionAvailabilitySummary> {
        return read(fetch, fetch.queries).pipe(
          last(),
          map((emission: SessionsForDateCacheEmission) => emission.value),
        );
      }

      function fetchWindow(fetch: SessionsForDateFetch, window: SessionsForDateWindow): Observable<SessionsForDateCacheEmission> {
        return read(
          fetch,
          fetch.queries.map(
            (query: SessionAvailabilityForDateQuery): SessionAvailabilityForDateQuery => ({ ...query, ...window, includeOngoing: false }),
          ),
        );
      }

      function readDay(fetch: SessionsForDateFetch): Observable<SessionsForDateRaceEmission> {
        const key = toDayKey(fetch);
        const preloadedDay = preloads.get(key);
        const preloadedWholeDay = preloadedDay?.wholeDay ?? null;

        if (preloadedDay !== undefined && preloadedWholeDay !== null) {
          preloads.delete(key);

          return preloadedWholeDay.pipe(
            finalize(() => {
              preloadedDay.call.unsubscribe();
            }),
            map((value: SessionAvailabilitySummary): SessionsForDateRaceEmission => ({ isStale: false, value })),
            catchError(() => readDay(fetch)),
          );
        }

        if (isFetchingWholeDay(fetch)) {
          return read(fetch, fetch.queries).pipe(catchError(() => readDay(fetch)));
        }

        const window = isEager(fetch, 'timeWindows') && !hasWholeDay(fetch) ? toSessionsForDateWindow(fetch) : null;

        if (window === null) {
          return read(fetch, fetch.queries);
        }

        return raceWindowAndWholeDay(fetchWindow(fetch, window), fetchWholeDay(fetch), window);
      }

      function readKeptDay(fetch: SessionsForDateFetch, keptDay: SessionAvailabilitySummary): Observable<SessionsForDateRaceEmission> {
        return concat(
          of<SessionsForDateRaceEmission>({ isStale: true, value: keptDay }),
          fetchWholeDay(fetch).pipe(
            map((value: SessionAvailabilitySummary): SessionsForDateRaceEmission => ({ isStale: false, value })),
            catchError(() => EMPTY),
          ),
        );
      }

      function takeKeptDay(fetch: SessionsForDateFetch): SessionAvailabilitySummary | null {
        const key = toDayKey(fetch);
        const preloadedDay = preloads.get(key);
        const keptDay = preloadedDay?.kept ?? null;

        if (preloadedDay !== undefined && keptDay !== null) {
          preloads.set(key, { ...preloadedDay, kept: null });
        }

        return keptDay;
      }

      function stopPreloadsOfAnotherSearch(fetch: SessionsForDateFetch): void {
        if (preloadSearchKey !== null && preloadSearchKey !== toSearchKey(fetch)) {
          preloadFollowingDays(null);
        }
      }

      function fetchDay(fetch: SessionsForDateFetch): Observable<SessionsForDateEmission> {
        return defer(() => {
          stopPreloadsOfAnotherSearch(fetch);

          const keptDay = takeKeptDay(fetch);
          const emissions = keptDay === null ? readDay(fetch) : readKeptDay(fetch, keptDay);

          return emissions.pipe(
            map(
              (emission: SessionsForDateRaceEmission, index: number): SessionsForDateEmission => ({
                ...emission,
                refreshesSettledDay: index > 0,
              }),
            ),
          );
        });
      }

      function toFollowingDayFetches(preload: SessionsForDatePreload): SessionsForDateFetch[] {
        if (!preload.fetch.cache.useSwr || !isEager(preload.fetch, 'preloadFollowingDays')) {
          return [];
        }

        return pickFollowingDays(untracked(store.dates), preload.fromDate, PRELOADED_FOLLOWING_DAYS)
          .map((day: string) => fetchOfDay(preload.fetch, day))
          .filter((dayFetch: SessionsForDateFetch) => !hasWholeDay(dayFetch));
      }

      function startPreload(dayFetch: SessionsForDateFetch, key: string): void {
        const call = new Subscription();
        const wholeDay = fetchWholeDay(dayFetch).pipe(share());

        preloads.set(key, { call, kept: null, wholeDay });
        call.add(
          wholeDay.subscribe({
            complete: () => {
              updatePreloadedDay(key, call, { wholeDay: null });
            },
            error: () => {
              if (preloads.get(key)?.call === call) {
                preloads.delete(key);
              }
            },
            next: (summary: SessionAvailabilitySummary) => {
              if (!hasWholeDay(dayFetch)) {
                updatePreloadedDay(key, call, { kept: summary });
              }
            },
          }),
        );
      }

      function updatePreloadedDay(
        key: string,
        call: Subscription,
        change: Partial<Pick<SessionsForDatePreloadedDay, 'kept' | 'wholeDay'>>,
      ): void {
        const preloadedDay = preloads.get(key);

        if (preloadedDay?.call === call) {
          preloads.set(key, { ...preloadedDay, ...change });
        }
      }

      function preloadFollowingDays(preload: SessionsForDatePreload | null): void {
        const dayFetches = preload === null ? [] : toFollowingDayFetches(preload);
        const keys = dayFetches.map(toDayKey);
        const fromDateKey = preload === null ? null : toDayKey(fetchOfDay(preload.fetch, preload.fromDate));

        preloads.forEach(({ call, wholeDay }: SessionsForDatePreloadedDay, key: string) => {
          if (!keys.includes(key) && !(key === fromDateKey && wholeDay !== null)) {
            call.unsubscribe();
            preloads.delete(key);
          }
        });
        preloadSearchKey = preload === null ? null : toSearchKey(preload.fetch);
        dayFetches.forEach((dayFetch: SessionsForDateFetch, index: number) => {
          if (!preloads.has(keys[index])) {
            startPreload(dayFetch, keys[index]);
          }
        });
      }

      function prefetchDay(fetch: SessionsForDateFetch): SessionsForDatePrefetch | null {
        if (!isEager(fetch, 'parallelLegs')) {
          return null;
        }

        const emissions = connectable(fetchDay(fetch), {
          resetOnDisconnect: false,
          connector: () => new ReplaySubject<SessionsForDateEmission>(),
        });
        const connection = emissions.connect();

        return {
          emissions,
          fromDate: fetch.queries[0].fromDate,
          cancel: () => {
            connection.unsubscribe();
          },
        };
      }

      return { fetchDay, prefetchDay, preloadFollowingDays };
    },
  ),
  withHooks({
    onDestroy(store): void {
      store.preloadFollowingDays(null);
    },
  }),
);

export type WithEagerSessionsStoreFeature = typeof eagerSessionsFeature;

export function withEagerSessionsStoreFeature(): WithEagerSessionsStoreFeature {
  return eagerSessionsFeature;
}
