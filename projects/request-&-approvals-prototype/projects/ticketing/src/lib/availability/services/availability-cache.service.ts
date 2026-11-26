import { Injectable } from '@angular/core';

import { Channel } from '@fz/channel';
import { catchError, concat, defer, EMPTY, finalize, map, of, share, tap, type Observable } from 'rxjs';

import type {
  AvailabilityCacheEmission,
  DatesAvailabilityCacheKey,
  SessionAvailabilityForDateCacheKey,
} from '../models/availability-cache.model';
import type { SessionAvailabilityForDateQuery } from '../models/availability-query.model';
import type { DatesAvailability } from '../models/date-availability.model';
import type { SessionAvailabilitySummary } from '../models/session-availability-summary.model';

type CacheKeyPart = boolean | number | string | readonly string[] | undefined;

const CACHEABLE_CHANNELS: readonly string[] = [Channel.BoxOffice, Channel.Kiosk];
// A read asks for one window of the day, and its bounds move with every minute. Keeping two holds
// the current one and the one before it, so SWR still answers a repeat read while a venue that stays
// on one plan all day stops accumulating every minute's windows.
const MAX_WINDOWS_PER_DAY = 2;

@Injectable()
export class AvailabilityCacheService {
  readonly #dates = new Map<string, DatesAvailability>();
  readonly #inFlightSessionsForDate = new Map<string, Observable<SessionAvailabilitySummary>>();
  readonly #sessionsForDate = new Map<string, SessionAvailabilitySummary>();
  readonly #windowKeysByDay = new Map<string, string[]>();

  clear(): void {
    this.#dates.clear();
    this.#sessionsForDate.clear();
    this.#windowKeysByDay.clear();
  }

  fetchSessionsForDate(
    key: SessionAvailabilityForDateCacheKey,
    fetch: () => Observable<SessionAvailabilitySummary>,
  ): Observable<SessionAvailabilitySummary> {
    const cacheKey = this.#sessionsForDateCacheKey(key);

    return defer(() => this.#inFlightSessionsForDate.get(cacheKey) ?? this.#startSessionsForDateFetch(cacheKey, fetch));
  }

  getDates(key: DatesAvailabilityCacheKey): DatesAvailability | null {
    if (!isCacheableChannel(key.query.channel)) {
      return null;
    }

    return this.#dates.get(this.#datesCacheKey(key)) ?? null;
  }

  getSessionsForDate(key: SessionAvailabilityForDateCacheKey): SessionAvailabilitySummary | null {
    if (!isCacheableChannel(key.query.channel)) {
      return null;
    }

    return this.#sessionsForDate.get(this.#sessionsForDateCacheKey(key)) ?? null;
  }

  isFetchingSessionsForDate(key: SessionAvailabilityForDateCacheKey): boolean {
    return this.#inFlightSessionsForDate.has(this.#sessionsForDateCacheKey(key));
  }

  readSessionsForDate(
    key: SessionAvailabilityForDateCacheKey,
    fetch: () => Observable<SessionAvailabilitySummary>,
  ): Observable<AvailabilityCacheEmission<SessionAvailabilitySummary>> {
    const fetched$ = this.fetchSessionsForDate(key, fetch).pipe(
      tap((summary: SessionAvailabilitySummary) => {
        this.setSessionsForDate(key, summary);
      }),
      map(
        (summary: SessionAvailabilitySummary): AvailabilityCacheEmission<SessionAvailabilitySummary> => ({
          isStale: false,
          value: summary,
        }),
      ),
    );
    const stored = this.getSessionsForDate(key);

    if (stored === null) {
      return fetched$;
    }

    if (key.useSwr !== true) {
      return of<AvailabilityCacheEmission<SessionAvailabilitySummary>>({ isStale: false, value: stored });
    }

    return concat(
      of<AvailabilityCacheEmission<SessionAvailabilitySummary>>({ isStale: true, value: stored }),
      fetched$.pipe(catchError(() => EMPTY)),
    );
  }

  setDates(key: DatesAvailabilityCacheKey, value: DatesAvailability): void {
    const cacheKey = this.#datesCacheKey(key);

    this.#dates.set(cacheKey, value);
    scheduleEviction(this.#dates, cacheKey, key.ttlSeconds);
  }

  setSessionsForDate(key: SessionAvailabilityForDateCacheKey, value: SessionAvailabilitySummary): void {
    const cacheKey = this.#sessionsForDateCacheKey(key);

    this.#sessionsForDate.set(cacheKey, value);
    scheduleEviction(this.#sessionsForDate, cacheKey, key.ttlSeconds);
    this.#boundWindowsOfDay(key, cacheKey);
  }

  #boundWindowsOfDay(key: SessionAvailabilityForDateCacheKey, cacheKey: string): void {
    if (toRequestedRangeKeyParts(key.query).length === 0) {
      return;
    }

    const dayKey = this.#sessionsForDayCacheKey(key);
    const windowKeys = (this.#windowKeysByDay.get(dayKey) ?? []).filter((windowKey: string) => windowKey !== cacheKey);
    windowKeys.push(cacheKey);
    windowKeys.splice(0, Math.max(0, windowKeys.length - MAX_WINDOWS_PER_DAY)).forEach((evictedKey: string) => {
      this.#sessionsForDate.delete(evictedKey);
    });
    this.#windowKeysByDay.set(dayKey, windowKeys);
  }

  #datesCacheKey(key: DatesAvailabilityCacheKey): string {
    const { query } = key;

    return [
      query.partnerId,
      query.planId,
      query.placeId,
      query.fromDate,
      query.timezone,
      query.includeOngoing,
      query.isHidden,
      query.channel,
      query.channelId,
      query.sessionTypeIds,
      query.includeSoldOutSessions,
      key.ttlSeconds,
    ]
      .map(toCacheKeyPart)
      .join('-');
  }

  #forgetSessionsForDateFetch(cacheKey: string, sharedFetch: Observable<SessionAvailabilitySummary>): void {
    if (this.#inFlightSessionsForDate.get(cacheKey) === sharedFetch) {
      this.#inFlightSessionsForDate.delete(cacheKey);
    }
  }

  #sessionsForDateCacheKey(key: SessionAvailabilityForDateCacheKey): string {
    return [this.#sessionsForDayCacheKey(key), ...toRequestedRangeKeyParts(key.query).map(toCacheKeyPart)].join('-');
  }

  #sessionsForDayCacheKey(key: SessionAvailabilityForDateCacheKey): string {
    const { query } = key;

    return [
      query.partnerId,
      query.planId,
      query.placeId,
      query.fromDate,
      query.timezone,
      query.includeOngoing,
      query.isHidden,
      query.channel,
      query.channelId,
      query.sessionTypeIds,
      query.includeSoldOutSessions,
      query.includeOverrideCapacity,
      key.ttlSeconds,
      key.contentLanguage,
      query.rescheduleOrderId,
      query.rescheduleReservationId,
      query.businessId,
      query.includeShopProducts,
      query.includeTimeSlotCapacity,
    ]
      .map(toCacheKeyPart)
      .join('-');
  }

  #startSessionsForDateFetch(
    cacheKey: string,
    fetch: () => Observable<SessionAvailabilitySummary>,
  ): Observable<SessionAvailabilitySummary> {
    const sharedFetch: Observable<SessionAvailabilitySummary> = defer(fetch).pipe(
      tap({
        complete: () => {
          this.#forgetSessionsForDateFetch(cacheKey, sharedFetch);
        },
        error: () => {
          this.#forgetSessionsForDateFetch(cacheKey, sharedFetch);
        },
      }),
      finalize(() => {
        this.#forgetSessionsForDateFetch(cacheKey, sharedFetch);
      }),
      share(),
    );

    this.#inFlightSessionsForDate.set(cacheKey, sharedFetch);

    return sharedFetch;
  }
}

function isCacheableChannel(channel: string | undefined): boolean {
  return channel !== undefined && channel.length > 0 && CACHEABLE_CHANNELS.includes(channel);
}

function scheduleEviction<TValue>(store: Map<string, TValue>, cacheKey: string, ttlSeconds: number | undefined): void {
  if (ttlSeconds === undefined || ttlSeconds <= 0) {
    return;
  }

  setTimeout(() => {
    store.delete(cacheKey);
  }, ttlSeconds * 1000);
}

function toCacheKeyPart(value: CacheKeyPart): string {
  return String(value);
}

function toRequestedRangeKeyParts(query: SessionAvailabilityForDateQuery): CacheKeyPart[] {
  if (query.startDatetime === undefined || query.endDatetime === undefined) {
    return [];
  }

  return [query.startDatetime, query.endDatetime];
}
