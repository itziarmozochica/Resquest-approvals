import { computed, inject, untracked } from '@angular/core';

import {
  AvailabilityCacheService,
  fetchOfDay,
  filterToSelectedAndOngoingDaySummaries,
  TicketingAvailabilityService,
  withAvailabilityStoreFeature,
  withEagerSessionsStoreFeature,
  type AvailabilityStoreState,
  type DateAvailability,
  type DatesAvailability,
  type DatesAvailabilityCacheKey,
  type DatesAvailabilityQuery,
  type DaySummary,
  type SessionAvailabilityForDateQuery,
  type SessionAvailabilitySummary,
  type SessionsForDateEmission,
  type SessionsForDateFetch,
  type SessionsForDatePrefetch,
} from '@fz/ticketing';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, defer, EMPTY, finalize, merge, of, pipe, switchMap, tap, type Observable } from 'rxjs';

import {
  initialState,
  type PosAvailabilityFetchInput,
  type PosAvailabilityFlowEvent,
  type PosAvailabilityFlowHandler,
  type PosAvailabilityQueryChannel,
  type PosAvailabilityRequest,
  type PosAvailabilityStoreRuntime,
  type PosAvailabilityStoreState,
} from '../models/store/pos-availability-store.model';
import { mergeModifyOrderChannelAvailability } from '../utils/merge-modify-order-channel-availability.util';

type PosAvailabilityState = AvailabilityStoreState & PosAvailabilityStoreState;

export const PosAvailabilityStore = signalStore(
  // FIRST on purpose: the feature's slices flatten onto the store, so the POS orchestration below can
  // patch them and read them mid-flight.
  withAvailabilityStoreFeature(),
  withEagerSessionsStoreFeature(),
  withState<PosAvailabilityStoreState>(initialState),
  withComputed(({ isLoadingSessions, isLoadingSessionsForDate }) => ({
    isLoadingAnySessions: computed<boolean>(() => isLoadingSessions() || isLoadingSessionsForDate()),
  })),
  withProps(() => ({
    _runtime: emptyRuntime(),
  })),
  withMethods((store, availabilityService = inject(TicketingAvailabilityService), cache = inject(AvailabilityCacheService)) => {
    const runtime = store._runtime;

    function emit(event: PosAvailabilityFlowEvent): void {
      runtime.flowHandler?.(event);
    }

    function commitDates(
      request: PosAvailabilityRequest,
      availability: DatesAvailability,
      prefetched: SessionsForDatePrefetch | null,
    ): Observable<unknown> {
      const dates = applyCapnSingleDayGuard(request, availability.dates);
      const newDates = Object.values(dates);
      const nextAvailableDate = availability.nextAvailableDate;
      // Every state read on the dispatch path is untracked: a cache hit runs this synchronously
      // inside the caller, and a caller may be an effect (B2BS-1599).
      const selectedAvailabilityFromDate = request.needsAvailabilityFromDateSeed
        ? firstDateKey(availability)
        : untracked(store.selectedAvailabilityFromDate);
      const datesAvailability = request.accumulateDates ? { ...untracked(store.datesAvailability), ...dates } : { ...dates };

      if (newDates.length === 0) {
        prefetched?.cancel();
        patchState(store, setDatesSuccess(), setSessionsForDateSuccess(), {
          availabilityAction: 'fetchEmpty',
          datesAvailability,
          nextAvailableDate,
          selectedAvailabilityFromDate,
        });
        emit({
          accumulateDates: request.accumulateDates,
          dates: [],
          fromDateIso: request.fromDate,
          kind: 'datesResolved',
          nextAvailableDate,
          selectedAvailabilityFromDate,
          selectedDate: null,
        });
        emit({
          isEmptyDatesResult: true,
          isStaleEmission: false,
          kind: 'settled',
          orderedDaySummaries: [],
          summary: emptySummary(nextAvailableDate),
        });

        return EMPTY;
      }

      const selectedDate = newDates[0].date;
      const fromDateIso = toWallClockMidnight(selectedDate);

      patchState(store, setDatesSuccess(), {
        datesAvailability,
        fromDateIso,
        nextAvailableDate,
        selectedAvailabilityFromDate,
        selectedDate,
      });
      emit({
        accumulateDates: request.accumulateDates,
        dates: newDates,
        fromDateIso,
        kind: 'datesResolved',
        nextAvailableDate,
        selectedAvailabilityFromDate,
        selectedDate,
      });

      if (prefetched !== null && prefetched.fromDate === fromDateIso) {
        return settleSessions(request, fromDateIso, prefetched.emissions);
      }
      prefetched?.cancel();

      return runSessionsLeg(request, fromDateIso);
    }

    function commitSummary(emission: SessionsForDateEmission): void {
      const summary = emission.value;
      const orderedDaySummaries = filterToSelectedAndOngoingDaySummaries(summary.daySummaries, summary.timezone);

      patchState(store, setSessionsForDateSuccess(), {
        allowMultiSessionPurchase: summary.allowMultiSessionPurchase,
        availabilityAction: 'fetchSuccess',
        daySummaries: toDaySummaryRecord(orderedDaySummaries),
        daySummaryOrder: orderedDaySummaries.map((daySummary: DaySummary) => daySummary.date),
        hasExplodePipe: summary.hasExplodePipe,
        isLoadingDates: false,
        nextAvailableDate: summary.nextAvailableDate ?? untracked(store.nextAvailableDate),
        pendingWholeDayWindow: emission.window ?? null,
        productSummaries: summary.productSummaries,
        sessionSelectorType: summary.sessionSelectorType,
        timezone: summary.timezone,
      });
      emit({
        isStaleEmission: emission.isStale,
        kind: 'settled',
        orderedDaySummaries,
        summary,
        ...(emission.refreshesSettledDay ? { refreshesSettledDay: true } : {}),
      });
    }

    function emptySummary(nextAvailableDate: string | null): SessionAvailabilitySummary {
      return {
        allowMultiSessionPurchase: untracked(store.allowMultiSessionPurchase),
        daySummaries: [],
        hasExplodePipe: untracked(store.hasExplodePipe),
        nextAvailableDate,
        productSummaries: [],
        sessionSelectorType: untracked(store.sessionSelectorType),
        timezone: untracked(store.timezone),
      };
    }

    /** Sessions-leg failures only: legacy swallowed dates-leg failures into the empty-calendar path. */
    function failFlow(error: unknown): Observable<never> {
      patchState(store, setSessionsForDateError(error), {
        availabilityAction: 'fetchError',
        isLoadingDates: false,
        isLoadingSessionsForDate: false,
        pendingWholeDayWindow: null,
      });
      emit({ error, kind: 'failed' });

      return EMPTY;
    }

    function fetchDates(request: PosAvailabilityRequest): Observable<DatesAvailability> {
      const query = toDatesQuery(request);

      if (!request.cache.useCache) {
        return availabilityService.getDatesAvailability(query);
      }

      const key: DatesAvailabilityCacheKey = { query, ttlSeconds: request.cache.ttlSeconds };
      const stored = cache.getDates(key);

      if (stored !== null) {
        return of(stored);
      }

      return availabilityService
        .getDatesAvailability(query)
        .pipe(tap((availability: DatesAvailability) => cache.setDates(key, availability)));
    }

    function runDatesFlow(request: PosAvailabilityRequest): Observable<unknown> {
      patchState(store, setDatesPending(), { availabilityAction: null, daySummaries: {}, daySummaryOrder: [] });

      const prefetched = store.prefetchDay(toSessionsForDateFetch(request, toWallClockMidnight(request.fromDate)));

      return fetchDates(request).pipe(
        switchMap((availability: DatesAvailability) => commitDates(request, availability, prefetched)),
        // Legacy's `getDatesAvailability` ended in `catchError(() => of(fromApi(null)))`: a dates
        // failure rendered the empty calendar, never the error screen. Sessions-leg failures still
        // fail inside `settleSessions`, which `commitDates` returns before this operator.
        catchError(() => commitDates(request, emptyDatesAvailability(), prefetched)),
        finalize(() => {
          prefetched?.cancel();
        }),
      );
    }

    function runFlow(request: PosAvailabilityRequest): Observable<unknown> {
      return request.onlyGetSessions ? runSessionsFlow(request) : runDatesFlow(request);
    }

    function runSessionsFlow(request: PosAvailabilityRequest): Observable<unknown> {
      if (!request.needsAvailabilityFromDateSeed) {
        return runSessionsLeg(request, request.fromDate);
      }

      // The dates leg runs only to seed the from-date picker; the calendar mirror is left untouched.
      return fetchDates(request).pipe(
        switchMap((availability: DatesAvailability) => {
          patchState(store, { selectedAvailabilityFromDate: firstDateKey(availability) });

          return runSessionsLeg(request, request.fromDate);
        }),
        // Legacy swallowed a seed failure the same way: the seed comes back null and the sessions
        // leg still runs.
        catchError(() => {
          patchState(store, { selectedAvailabilityFromDate: null });

          return runSessionsLeg(request, request.fromDate);
        }),
      );
    }

    function runSessionsLeg(request: PosAvailabilityRequest, fromDate: string): Observable<unknown> {
      return settleSessions(request, fromDate, store.fetchDay(toSessionsForDateFetch(request, fromDate)));
    }

    function settleSessions(
      request: PosAvailabilityRequest,
      fromDate: string,
      emissions: Observable<SessionsForDateEmission>,
    ): Observable<unknown> {
      patchState(store, setSessionsForDatePending());

      // Subscribed after the selected day's fetch, so its call goes out first and the following days join it at once.
      return merge(
        emissions.pipe(
          tap((emission: SessionsForDateEmission) => {
            commitSummary(emission);
          }),
          catchError((error: unknown) => failFlow(error)),
        ),
        defer(() => {
          store.preloadFollowingDays({ fetch: toSessionsForDateFetch(request, fromDate), fromDate });

          return EMPTY;
        }),
      );
    }

    return {
      fetchAvailability: rxMethod<PosAvailabilityFetchInput>(
        pipe(
          switchMap((input: PosAvailabilityFetchInput) => {
            if ('kind' in input) {
              patchState(store, { isLoadingDates: false, isLoadingSessionsForDate: false, pendingWholeDayWindow: null });

              return EMPTY;
            }

            return runFlow(input).pipe(
              finalize(() => {
                patchState(store, { pendingWholeDayWindow: null });
                emit({ kind: 'superseded' });
              }),
            );
          }),
        ),
      ),
      clearAvailabilityCaches(): void {
        cache.clear();
        store.preloadFollowingDays(null);
      },
      registerFlowHandler(handler: PosAvailabilityFlowHandler): void {
        runtime.flowHandler = handler;
      },
      resetForNewSearch(): void {
        store.preloadFollowingDays(null);
        store.clearAvailability();
        store.clearSelection();
        patchState(store, initialState);
      },
      setAvailabilityFromDate(dateIso: string | null): void {
        patchState(store, { selectedAvailabilityFromDate: dateIso });
      },
    };
  }),
);

function applyCapnSingleDayGuard(
  request: PosAvailabilityRequest,
  dates: Readonly<Record<string, DateAvailability>>,
): Readonly<Record<string, DateAvailability>> {
  const dateKeys = Object.keys(dates);

  if (!request.capnSingleDayGuard || dateKeys.length === 0) {
    return dates;
  }

  return isSameCalendarDay(dateKeys[0], request.fromDate) ? dates : {};
}

function firstDateKey(availability: DatesAvailability): string | null {
  return Object.keys(availability.dates)[0] ?? null;
}

/**
 * Legacy compared the two as UTC instants. Comparing the calendar-day prefixes is the same test for
 * the values involved (a `YYYY-MM-DD` payload key against a UTC-midnight from-date) and stays correct
 * whichever way the runtime parses a zone-less string.
 */
function isSameCalendarDay(first: string, second: string): boolean {
  return first.slice(0, 10) === second.slice(0, 10);
}

function emptyRuntime(): PosAvailabilityStoreRuntime {
  return { flowHandler: null };
}

function emptyDatesAvailability(): DatesAvailability {
  return { dates: {}, nextAvailableDate: null };
}

function setDatesPending(): Partial<PosAvailabilityState> {
  return { datesError: null, isLoadingDates: true };
}

function setDatesSuccess(): Partial<PosAvailabilityState> {
  return { datesError: null, isLoadingDates: false };
}

function setSessionsForDateError(error: unknown): Partial<PosAvailabilityState> {
  return { isLoadingSessionsForDate: false, sessionsForDateError: error };
}

function setSessionsForDatePending(): Partial<PosAvailabilityState> {
  return { isLoadingSessionsForDate: true, sessionsForDateError: null };
}

function setSessionsForDateSuccess(): Partial<PosAvailabilityState> {
  return { isLoadingSessionsForDate: false, sessionsForDateError: null };
}

function toDatesQuery(request: PosAvailabilityRequest): DatesAvailabilityQuery {
  return {
    ...toDatesChannel(request),
    dataConsistency: request.dataConsistency,
    daysWithActiveSession: request.daysWithActiveSession,
    fromDate: request.fromDate,
    includeOngoing: request.includeOngoing,
    includeSoldOutSessions: request.includeSoldOutSessions,
    isHidden: request.isHidden,
    partnerId: request.partnerId,
    placeId: request.placeId,
    planId: request.planId,
    sessionTypeIds: request.sessionTypeIds,
    timezone: request.timezone,
  };
}

function toDatesChannel(request: PosAvailabilityRequest): PosAvailabilityQueryChannel {
  const original = request.modifyOrderChannels?.original;

  return original === undefined ? { channel: request.channel, channelId: request.channelId } : { channel: original, channelId: original };
}

function toDaySummaryRecord(daySummaries: readonly DaySummary[]): Record<string, DaySummary> {
  return daySummaries.reduce<Record<string, DaySummary>>((accumulator: Record<string, DaySummary>, daySummary: DaySummary) => {
    accumulator[daySummary.date] = daySummary;

    return accumulator;
  }, {});
}

function toSessionsForDateFetch(request: PosAvailabilityRequest, fromDate: string): SessionsForDateFetch {
  const channels = toSessionsForDateChannels(request);
  const fetch: SessionsForDateFetch = {
    cache: {
      contentLanguage: request.contentLanguage,
      ttlSeconds: request.cache.ttlSeconds,
      useCache: request.cache.useCache,
      useSwr: request.cache.useSwr,
    },
    queries: channels.map((queryChannel: PosAvailabilityQueryChannel) => toSessionsForDateQuery(request, queryChannel)),
    ...(channels.length > 1 ? { merge: mergeChannelSummaries } : {}),
    ...(request.modifyOrderSessionStartsAt === undefined ? {} : { modifyOrderSessionStartsAt: request.modifyOrderSessionStartsAt }),
  };

  return fetchOfDay(fetch, fromDate);
}

function mergeChannelSummaries([original, onsiteSetup]: readonly SessionAvailabilitySummary[]): SessionAvailabilitySummary {
  return mergeModifyOrderChannelAvailability(original, onsiteSetup);
}

function toSessionsForDateQuery(
  request: PosAvailabilityRequest,
  { channel, channelId }: PosAvailabilityQueryChannel,
): SessionAvailabilityForDateQuery {
  return {
    businessId: request.businessId,
    channel,
    channelId,
    fromDate: request.fromDate,
    includeOngoing: request.includeOngoingForSessions,
    includeOverrideCapacity: request.includeOverrideCapacity,
    includeShopProducts: request.includeShopProducts,
    includeSoldOutSessions: request.includeSoldOutSessions,
    includeTimeSlotCapacity: request.includeTimeSlotCapacity,
    isHidden: request.isHidden,
    partnerId: request.partnerId,
    placeId: request.placeId,
    planId: request.planId,
    rescheduleOrderId: request.rescheduleOrderId,
    rescheduleReservationId: request.rescheduleReservationId,
    sessionTypeIds: request.sessionTypeIds,
    timezone: request.timezone,
  };
}

/** Same wall-clock contract as `PosAvailabilityRequest.fromDate`: no zone suffix, the mappers reject one. */
function toSessionsForDateChannels(request: PosAvailabilityRequest): PosAvailabilityQueryChannel[] {
  const channels = request.modifyOrderChannels;

  if (channels === undefined) {
    return [{ channel: request.channel, channelId: request.channelId }];
  }

  if (channels.original === channels.onsiteSetupChannelId) {
    return [{ channel: channels.original, channelId: channels.original }];
  }

  return [
    { channel: channels.original, channelId: channels.original },
    { channel: channels.onsiteSetupChannelId, channelId: channels.onsiteSetupChannelId },
  ];
}

function toWallClockMidnight(date: string): string {
  return `${date.slice(0, 10)}T00:00:00`;
}
