import { InjectionToken } from '@angular/core';

import { NEVER, Observable } from 'rxjs';

import { SessionAvailabilitySummaryByDate } from '../../../shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDatetime } from '../../../shared/models/session-availability/session-availability-summary-by-datetime.model';
import { RealTimeSelectionChangeReason } from '../../../shared/seating-selector/services/seating-selector-messenger/messages/real-time-selection-change-message';

export const realTimeBasketExpiredReason: RealTimeSelectionChangeReason = 'expired';

export const kioskRealTimeSeatingLiterals = {
  cartErrorMessage: 'kiosk.ticketing.realTimeSeating.cartErrorMessage',
  cartErrorTitle: 'kiosk.ticketing.realTimeSeating.cartErrorTitle',
  expiredMessage: 'kiosk.ticketing.realTimeSeating.expiredMessage',
  expiredTitle: 'kiosk.ticketing.realTimeSeating.expiredTitle',
} as const; // literal keys, so each one is its own type for the translate calls

export const kioskRealTimeReleaseDefaultMaxWaitMs = 1500;

export const kioskRealTimeReleaseConfigVariableKey = 'config';

export const kioskRealTimeTimeslotStateKey = 'realTimeTimeslot';

export const kioskInactivityResetMessage = 'Kiosk inactivity reset';

/** What a leave's wait for the real-time cart yields when the creation did not answer within the maximum wait. */
export const realTimeCartCreationTimedOut: unique symbol = Symbol('realTimeCartCreationTimedOut');

/** What a leave's wait for the map's `finalized` yields when the map did not answer Continue within the maximum wait. */
export const realTimeFinishTimedOut: unique symbol = Symbol('realTimeFinishTimedOut');

/** The map's confirmation that a `delete-order` released the basket. The widget sends none yet, so by default it never emits. */
export const KIOSK_REAL_TIME_RELEASE_CONFIRMATION = new InjectionToken<Observable<unknown>>('KIOSK_REAL_TIME_RELEASE_CONFIRMATION', {
  factory: (): Observable<unknown> => NEVER,
});

/** The `config` JSON variable of the `kiosk_real_time_release_wait` Optimizely flag. */
export interface KioskRealTimeReleaseConfig {
  max_wait_ms: number;
}

/** The timeslot whose seat map a real-time purchase reopens empty after checkout or payment gives the basket up. */
export interface KioskRealTimeTimeslot {
  datetime: string;
  sessionIds: number[];
}

/** The loaded date and datetime a {@link KioskRealTimeTimeslot} reopens. */
export interface KioskRealTimeTimeslotMatch {
  datetime: SessionAvailabilitySummaryByDatetime;
  summary: SessionAvailabilitySummaryByDate;
}

/** What the ticketing route waits for before it lets the kiosk leave, so the seat map can release its basket first. */
export interface KioskRealTimeLeaveHandler {
  releaseBeforeLeave(targetUrl: string): Observable<boolean>;
}

export type KioskInactivityScreen = 'booking_questions' | 'checkout' | 'payment' | 'ticketing';

export interface KioskInactivityResetContext {
  hasLiveRealTimeBasket: boolean;
  screen: KioskInactivityScreen;
  cartId?: string;
  planId?: number;
  step?: number;
}
