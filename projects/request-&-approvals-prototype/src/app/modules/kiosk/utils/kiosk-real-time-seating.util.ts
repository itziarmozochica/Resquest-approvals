import { map, Observable, race, take, timer } from 'rxjs';

import { CartSession } from '../../../shared/models/cart/cart-session.model';
import { Cart } from '../../../shared/models/cart/cart.model';
import { Money } from '../../../shared/models/money.model';
import { SessionAvailabilitySummaryByDate } from '../../../shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDatetime } from '../../../shared/models/session-availability/session-availability-summary-by-datetime.model';
import { SessionAvailability } from '../../../shared/models/session-availability/session-availability.model';
import { SeatInfo } from '../../../shared/seating-selector/components/seating-selector/__data__/seat-info.model';
import {
  ExternalItem,
  RealTimeSelection,
} from '../../../shared/seating-selector/services/seating-selector-messenger/messages/real-time-selection-change-message';
import { KioskPlanDetail } from '../models/kiosk-plan.model';
import {
  KioskRealTimeReleaseConfig,
  kioskRealTimeReleaseDefaultMaxWaitMs,
  KioskRealTimeTimeslot,
  KioskRealTimeTimeslotMatch,
} from '../models/kiosk-real-time-seating.model';
import { isKioskRealTimePlan } from './kiosk-plan.util';

/**
 * One `SeatInfo` per unit, so the line's units match the selector's counter (the sum of `itemCount`). Unnumbered
 * sectors repeat the same `seatReference` for every entry, so the seats stay a list. `itemPrice` is the final
 * price the map charges for one unit and is display-only: the cart response replaces it.
 */
export function toRealTimeSeatInfos(items: ExternalItem[], currency: string): SeatInfo[] {
  return items.flatMap((item: ExternalItem) =>
    Array.from(
      { length: Math.max(0, item.itemCount) },
      () => new SeatInfo(item.seatReference, item.seatLabel, item.seatLabel, new Money(item.itemPrice, currency)),
    ),
  );
}

/** A copy of `entries` where `key` holds `value`, or where `key` is absent when `value` is `null`. */
export function withMapEntry<V>(entries: Map<string, V>, key: string, value: V | null): Map<string, V> {
  const others: [string, V][] = [...entries].filter(([entryKey]: [string, V]) => entryKey !== key);
  return new Map(value === null ? others : [...others, [key, value]]);
}

/** The basket stays with checkout while the map still holds entries; an emptied or expired basket has nothing to hand back. */
export function isBasketStillHandedToCheckout(isHandedToCheckout: boolean, selection: RealTimeSelection): boolean {
  return isHandedToCheckout && selection.items.length > 0;
}

/**
 * Emits once, when the map confirms the release or when `maxWaitMs` runs out, whichever comes first. Until then the
 * seat map must stay mounted: unmounting its iframe right after `delete-order` loses the request.
 */
export function waitForRealTimeRelease(confirmation$: Observable<unknown>, maxWaitMs: number): Observable<void> {
  return race(confirmation$.pipe(take(1)), timer(maxWaitMs)).pipe(map((): void => undefined));
}

export function toRealTimeReleaseMaxWaitMs(config: unknown): number {
  return isRealTimeReleaseConfig(config) ? config.max_wait_ms : kioskRealTimeReleaseDefaultMaxWaitMs;
}

/** The timeslot of the cart's seated lines, the one whose seat map a real-time purchase reopens. */
export function toRealTimeTimeslot(cart: Cart): KioskRealTimeTimeslot | null {
  const seatedEntry: [string, CartSession[]] | undefined = [...cart.sessionItemsByDatetime].find(([, sessions]: [string, CartSession[]]) =>
    sessions.some(isSeatedCartSession),
  );
  if (seatedEntry === undefined) {
    return null;
  }
  const [datetime, sessions] = seatedEntry;
  return { datetime, sessionIds: sessions.filter(isSeatedCartSession).map((session: CartSession) => session.sessionId) };
}

/** A cart of the step-by-step flow whose seats a real-time map holds: giving it up must reopen that map. */
export function isKioskRealTimeCart(isStepperFlowEnabled: boolean, plan: KioskPlanDetail | null, cart: Cart | null): boolean {
  return isStepperFlowEnabled && cart !== null && isKioskRealTimePlan(plan) && toRealTimeTimeslot(cart) !== null;
}

export function isKioskRealTimeTimeslot(value: unknown): value is KioskRealTimeTimeslot {
  return (
    value !== null &&
    typeof value === 'object' &&
    'datetime' in value &&
    typeof value.datetime === 'string' &&
    'sessionIds' in value &&
    Array.isArray(value.sessionIds) &&
    value.sessionIds.every((sessionId: unknown) => typeof sessionId === 'number')
  );
}

/**
 * The loaded date and datetime of `timeslot`: the same instant with a seated session. The cart's session ids only break
 * a tie, because the lines fever2 rebuilds from the OneBox basket carry ids the availability does not list.
 */
export function findRealTimeTimeslot(
  summaries: SessionAvailabilitySummaryByDate[],
  timeslot: KioskRealTimeTimeslot,
): KioskRealTimeTimeslotMatch | null {
  const startsAt: number = Date.parse(timeslot.datetime);
  const candidates: KioskRealTimeTimeslotMatch[] = summaries.flatMap((summary: SessionAvailabilitySummaryByDate) =>
    summary.sessionAvailabilityByDatetimeList
      .filter(
        (datetime: SessionAvailabilitySummaryByDatetime) =>
          Date.parse(datetime.datetime) === startsAt &&
          datetime.sessionAvailabilityList.some((session: SessionAvailability) => session.seating != null),
      )
      .map((datetime: SessionAvailabilitySummaryByDatetime): KioskRealTimeTimeslotMatch => ({ datetime, summary })),
  );
  const withCartSession: KioskRealTimeTimeslotMatch | undefined = candidates.find(({ datetime }: KioskRealTimeTimeslotMatch) =>
    datetime.sessionAvailabilityList.some((session: SessionAvailability) => timeslot.sessionIds.includes(session.id)),
  );
  return withCartSession ?? candidates[0] ?? null;
}

/** Whether the path of `url` is the checkout of `cartId`, the one place a created real-time cart is handed to. */
export function isKioskCheckoutUrl(url: string, cartId: string | undefined): boolean {
  return cartId !== undefined && url.split(/[?#]/)[0] === `/kiosk/checkout/${cartId}`;
}

function isRealTimeReleaseConfig(config: unknown): config is KioskRealTimeReleaseConfig {
  return (
    config !== null &&
    typeof config === 'object' &&
    'max_wait_ms' in config &&
    typeof config.max_wait_ms === 'number' &&
    Number.isFinite(config.max_wait_ms) &&
    config.max_wait_ms > 0
  );
}

function isSeatedCartSession(session: CartSession): boolean {
  return session.hasSeating ?? (session.seatingProvider != null || (session.seats?.length ?? 0) > 0);
}
