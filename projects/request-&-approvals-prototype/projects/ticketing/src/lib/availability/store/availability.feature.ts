import { computed, inject, untracked } from '@angular/core';

import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import type { DatesAvailabilityQuery, SessionAvailabilityForDateQuery, SessionAvailabilityQuery } from '../models/availability-query.model';
import type { DateAvailability, DatesAvailability } from '../models/date-availability.model';
import type { DaySummary, SessionAvailabilitySummary, TimeslotSummary } from '../models/session-availability-summary.model';
import { initialState, type AvailabilityStoreState } from '../models/store/availability-store.model';
import { TicketingAvailabilityService } from '../services/availability.service';

type DatesRequestState = Pick<AvailabilityStoreState, 'datesError' | 'isLoadingDates'>;

type SessionsRequestState = Pick<AvailabilityStoreState, 'isLoadingSessions' | 'sessionsError'>;

type SessionsForDateRequestState = Pick<AvailabilityStoreState, 'isLoadingSessionsForDate' | 'sessionsForDateError'>;

type SessionSummaryState = Pick<
  AvailabilityStoreState,
  | 'allowMultiSessionPurchase'
  | 'daySummaries'
  | 'hasExplodePipe'
  | 'nextAvailableDate'
  | 'productSummaries'
  | 'sessionSelectorType'
  | 'timezone'
>;

function setDatesPending(): DatesRequestState {
  return { datesError: null, isLoadingDates: true };
}

function setDatesError(error: unknown): DatesRequestState {
  return { datesError: error, isLoadingDates: false };
}

function setDatesSuccess(): DatesRequestState {
  return { datesError: null, isLoadingDates: false };
}

function setSessionsPending(): SessionsRequestState {
  return { isLoadingSessions: true, sessionsError: null };
}

function setSessionsError(error: unknown): SessionsRequestState {
  return { isLoadingSessions: false, sessionsError: error };
}

function setSessionsSuccess(): SessionsRequestState {
  return { isLoadingSessions: false, sessionsError: null };
}

function setSessionsForDatePending(): SessionsForDateRequestState {
  return { isLoadingSessionsForDate: true, sessionsForDateError: null };
}

function setSessionsForDateError(error: unknown): SessionsForDateRequestState {
  return { isLoadingSessionsForDate: false, sessionsForDateError: error };
}

function setSessionsForDateSuccess(): SessionsForDateRequestState {
  return { isLoadingSessionsForDate: false, sessionsForDateError: null };
}

function byDate(first: { readonly date: string }, second: { readonly date: string }): number {
  return first.date.localeCompare(second.date);
}

function byDatetime(first: { readonly datetime: string }, second: { readonly datetime: string }): number {
  return first.datetime.localeCompare(second.datetime);
}

function toDaySummaryRecord(daySummaries: readonly DaySummary[]): Record<string, DaySummary> {
  return daySummaries.reduce<Record<string, DaySummary>>((accumulator, daySummary) => {
    accumulator[daySummary.date] = daySummary;

    return accumulator;
  }, {});
}

function toSessionSummaryState(summary: SessionAvailabilitySummary, currentNextAvailableDate: string | null): SessionSummaryState {
  return {
    allowMultiSessionPurchase: summary.allowMultiSessionPurchase,
    daySummaries: toDaySummaryRecord(summary.daySummaries),
    hasExplodePipe: summary.hasExplodePipe,
    nextAvailableDate: summary.nextAvailableDate ?? currentNextAvailableDate,
    productSummaries: summary.productSummaries,
    sessionSelectorType: summary.sessionSelectorType,
    timezone: summary.timezone,
  };
}

const availabilityFeature = signalStoreFeature(
  withState<AvailabilityStoreState>(initialState),
  withComputed(({ datesAvailability, daySummaries, selectedDate }) => ({
    dates: computed<readonly DateAvailability[]>(() => Object.values(datesAvailability()).sort(byDate)),
    selectedDaySummary: computed<DaySummary | null>(() => {
      const date = selectedDate();

      return date === null ? null : (daySummaries()[date] ?? null);
    }),
  })),
  withComputed(({ dates, daySummaries, nextAvailableDate, selectedDatetime, selectedDaySummary }) => ({
    firstAvailableDate: computed<string | null>(() => dates().find(date => date.isPurchasable)?.date ?? nextAvailableDate()),
    firstAvailableDatetime: computed<string | null>(() => {
      const firstDayWithTimeslots = Object.values(daySummaries())
        .sort(byDate)
        .find(daySummary => daySummary.timeslots.length > 0);

      if (firstDayWithTimeslots === undefined) {
        return null;
      }

      return [...firstDayWithTimeslots.timeslots].sort(byDatetime)[0].datetime;
    }),
    selectedTimeslot: computed<TimeslotSummary | null>(() => {
      const datetime = selectedDatetime();

      if (datetime === null) {
        return null;
      }

      return selectedDaySummary()?.timeslots.find(timeslot => timeslot.datetime === datetime) ?? null;
    }),
  })),
  withMethods((store, availabilityService = inject(TicketingAvailabilityService)) => {
    /**
     * Which reload the in-flight requests belong to. Each `switchMap` only cancels its own
     * predecessor, and a reload starts exactly one of the three fetches — so without a stamp the
     * other two would still be running for the previous plan and would commit its summary over the
     * new one. `clearAvailability` bumps this, and a response whose stamp no longer matches is
     * dropped.
     */
    let generation = 0;

    function isStale(startedAt: number): boolean {
      return startedAt !== generation;
    }

    return {
      fetchDatesAvailability: rxMethod<DatesAvailabilityQuery>(
        pipe(
          switchMap((query: DatesAvailabilityQuery) => {
            const startedAt = generation;

            patchState(store, setDatesPending());

            return availabilityService.getDatesAvailability(query).pipe(
              tap((availability: DatesAvailability) => {
                if (isStale(startedAt)) {
                  return;
                }

                patchState(store, setDatesSuccess(), {
                  datesAvailability: availability.dates,
                  nextAvailableDate: availability.nextAvailableDate,
                });
              }),
              catchError((error: unknown) => {
                if (!isStale(startedAt)) {
                  patchState(store, setDatesError(error));
                }

                return EMPTY;
              }),
            );
          }),
        ),
      ),
      fetchSessionAvailability: rxMethod<SessionAvailabilityQuery>(
        pipe(
          switchMap((query: SessionAvailabilityQuery) => {
            const startedAt = generation;

            patchState(store, setSessionsPending());

            return availabilityService.getSessionAvailability(query).pipe(
              tap((summary: SessionAvailabilitySummary) => {
                if (isStale(startedAt)) {
                  return;
                }

                patchState(store, setSessionsSuccess(), toSessionSummaryState(summary, untracked(store.nextAvailableDate)));
              }),
              catchError((error: unknown) => {
                if (!isStale(startedAt)) {
                  patchState(store, setSessionsError(error));
                }

                return EMPTY;
              }),
            );
          }),
        ),
      ),
      fetchSessionAvailabilityForDate: rxMethod<SessionAvailabilityForDateQuery>(
        pipe(
          switchMap((query: SessionAvailabilityForDateQuery) => {
            const startedAt = generation;

            patchState(store, setSessionsForDatePending());

            return availabilityService.getSessionAvailabilityForDate(query).pipe(
              tap((summary: SessionAvailabilitySummary) => {
                if (isStale(startedAt)) {
                  return;
                }

                patchState(store, setSessionsForDateSuccess(), toSessionSummaryState(summary, untracked(store.nextAvailableDate)));
              }),
              catchError((error: unknown) => {
                if (!isStale(startedAt)) {
                  patchState(store, setSessionsForDateError(error));
                }

                return EMPTY;
              }),
            );
          }),
        ),
      ),
      /**
       * Abandons everything the availability requests have produced so far, so a store reloading for a
       * different plan cannot keep rendering the previous one's calendar as live while the new response
       * is in flight.
       *
       * Every fetched slice goes back to its initial value **and** the in-flight requests are
       * disowned: each of the three fetches carries the generation it started in, so one still running
       * for the previous plan can no longer commit its summary — which is why the errors and loading
       * flags reset here too. A request nobody is waiting for has no lifecycle left to own them.
       */
      clearAvailability(): void {
        generation += 1;

        patchState(store, {
          allowMultiSessionPurchase: initialState.allowMultiSessionPurchase,
          datesAvailability: initialState.datesAvailability,
          datesError: initialState.datesError,
          daySummaries: initialState.daySummaries,
          hasExplodePipe: initialState.hasExplodePipe,
          isLoadingDates: initialState.isLoadingDates,
          isLoadingSessions: initialState.isLoadingSessions,
          isLoadingSessionsForDate: initialState.isLoadingSessionsForDate,
          nextAvailableDate: initialState.nextAvailableDate,
          productSummaries: initialState.productSummaries,
          sessionSelectorType: initialState.sessionSelectorType,
          sessionsError: initialState.sessionsError,
          sessionsForDateError: initialState.sessionsForDateError,
          timezone: initialState.timezone,
        });
      },
      clearDatesError(): void {
        patchState(store, { datesError: null });
      },
      clearSelection(): void {
        patchState(store, { selectedDate: null, selectedDatetime: null });
      },
      clearSessionsError(): void {
        patchState(store, { sessionsError: null });
      },
      clearSessionsForDateError(): void {
        patchState(store, { sessionsForDateError: null });
      },
      selectDate(date: string | null): void {
        const hasChanged = date !== untracked(store.selectedDate);

        patchState(store, {
          selectedDate: date,
          selectedDatetime: hasChanged ? null : untracked(store.selectedDatetime),
        });
      },
      selectDatetime(datetime: string | null): void {
        patchState(store, { selectedDatetime: datetime });
      },
    };
  }),
);

export type WithAvailabilityStoreFeature = typeof availabilityFeature;

export function withAvailabilityStoreFeature(): WithAvailabilityStoreFeature {
  return availabilityFeature;
}
