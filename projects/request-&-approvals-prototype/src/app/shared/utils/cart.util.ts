import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';

import { CartSession } from '../models/cart/cart-session.model';
import { Cart } from '../models/cart/cart.model';
import { Money } from '../models/money.model';

/** One seat of a real-time line, shown as its own cart card. `row` and `seat` are `null` when the label carries no position. */
export interface RealTimeSeatCard {
  name: string;
  price: Money;
  row: string | null;
  seat: string | null;
}

export class CartUtil {
  static getSplittablePackUnitCount(session: CartSession): number {
    const units = session.units ?? 0;
    const pendingTransferUnits = (session.ticketTransferIntents ?? [])
      .filter(intent => intent.status === 'pending')
      .reduce((sum, intent) => sum + Math.max(0, intent.count ?? 0), 0);
    return Math.max(0, units - pendingTransferUnits);
  }

  static hasSessionsInFuture(sessionItemsByDatetime: Map<string, CartSession[]>, timezone: string): boolean {
    const getDeadline = (timezone: string): string => {
      const deadline: moment.Moment = moment().tz(timezone);
      deadline.add(1, 'days');
      deadline.hours(6);
      deadline.minutes(0);
      deadline.seconds(0);
      deadline.millisecond(0);
      return deadline.format();
    };

    const isSessionAfterTime = (session: CartSession, deadline: string): boolean => {
      const sessionDeadline: moment.Moment = moment(deadline).tz(session.sessionTimezone ?? '');
      const currentSession: moment.Moment = moment(session.sessionStartAt).tz(session.sessionTimezone ?? '');
      return currentSession.isAfter(sessionDeadline);
    };

    let hasSessionsInFuture = false;
    sessionItemsByDatetime.forEach((cartSessions: CartSession[]) => {
      if (cartSessions.some(session => isSessionAfterTime(session, getDeadline(timezone)))) {
        hasSessionsInFuture = true;
        return;
      }
    });
    return hasSessionsInFuture;
  }

  /**
   * Returns a new cart without the line `sessionId` of the time slot stored under `datetimeKey`
   * (a `sessionItemsByDatetime` key). A slot left without lines is dropped as well.
   * Works for both confirmed and unconfirmed carts (client-side filtering).
   * @returns The filtered cart, or null if the cart becomes empty.
   */
  static removeCartSessionFromDatetime(cart: Cart, datetimeKey: string, sessionId: number): Cart | null {
    // Filter the clone, not the input: `calculateTotal` writes prices onto the remaining lines.
    const newCart = cart.clone();
    const newSessionItemsByDatetime = new Map<string, CartSession[]>();

    newCart.sessionItemsByDatetime.forEach((sessions, datetime) => {
      const filteredSessions = datetime === datetimeKey ? sessions.filter(session => session.sessionId !== sessionId) : sessions;
      if (filteredSessions.length > 0) {
        newSessionItemsByDatetime.set(datetime, filteredSessions);
      }
    });

    if (newSessionItemsByDatetime.size === 0) {
      return null;
    }

    newCart.sessionItemsByDatetime = newSessionItemsByDatetime;
    newCart.timezone = cart.timezone;
    CartUtil.#recalculateTotalWhenPriced(newCart);
    return newCart;
  }

  /**
   * Returns a new cart with the units of the line `sessionId` in the slot `datetimeKey` replaced.
   * `units <= 0` removes the line (see `removeCartSessionFromDatetime`). Returns the same cart when the
   * line is not found, so callers can compare references.
   */
  static updateCartSessionUnits(cart: Cart, datetimeKey: string, sessionId: number, units: number): Cart | null {
    if (units <= 0) {
      return CartUtil.removeCartSessionFromDatetime(cart, datetimeKey, sessionId);
    }
    const hasLine = cart.sessionItemsByDatetime.get(datetimeKey)?.some(session => session.sessionId === sessionId) ?? false;
    if (!hasLine) {
      return cart;
    }

    const newCart = cart.clone();
    const line = newCart.sessionItemsByDatetime.get(datetimeKey)?.find(session => session.sessionId === sessionId);
    if (line) {
      line.units = units;
    }
    newCart.timezone = cart.timezone;
    CartUtil.#recalculateTotalWhenPriced(newCart);
    return newCart;
  }

  /**
   * `Cart.calculateTotal` throws on a line without a unit price, which quote-preloaded lines may lack.
   * Keep the previous total then: the backend reprices the cart on *Continue*.
   */
  static #recalculateTotalWhenPriced(cart: Cart): void {
    const everyLinePriced = [...cart.sessionItemsByDatetime.values()].every(sessions =>
      sessions.every(session => session.unitPrice != null),
    );
    if (everyLinePriced) {
      cart.calculateTotal(cart.appliedCoupon ?? undefined);
    }
  }

  /** Whether the line holds seat-mapped tickets (mirrors the One Stop Shop cart rule). */
  static isCartSessionSeatingLine(session: CartSession): boolean {
    if (session.sessionType?.isShopProduct) {
      return false;
    }
    if (session.hasSeating === false) {
      return false;
    }
    if (session.hasSeating === true) {
      return true;
    }
    return (
      session.seatingProvider != null ||
      (session.seats?.length ?? 0) > 0 ||
      (session.seatLabels?.length ?? 0) > 0 ||
      (session.seatDisplayLabels?.length ?? 0) > 0
    );
  }

  /**
   * Returns a new cart with all sessions for the given mainPlanId removed.
   * Works for both confirmed and unconfirmed carts (client-side filtering).
   * @returns The filtered cart, or null if the cart becomes empty.
   */
  static removeSessionsByMainPlanId(cart: Cart, mainPlanId: number, preserveSessionIds?: ReadonlySet<number>): Cart | null {
    const newSessionItemsByDatetime = new Map<string, CartSession[]>();

    cart.sessionItemsByDatetime.forEach((sessions, datetime) => {
      const filteredSessions = sessions.filter(
        s => s.mainPlanId !== mainPlanId || (preserveSessionIds != null && s.sessionId != null && preserveSessionIds.has(s.sessionId)),
      );
      if (filteredSessions.length > 0) {
        newSessionItemsByDatetime.set(datetime, filteredSessions);
      }
    });

    if (newSessionItemsByDatetime.size === 0) {
      return null;
    }

    const newCart = cart.clone();
    newCart.sessionItemsByDatetime = newSessionItemsByDatetime;
    newCart.hasSeating = [...newSessionItemsByDatetime.values()]
      .flat()
      .some((session: CartSession) => CartUtil.isCartSessionSeatingLine(session));
    newCart.timezone = cart.timezone;
    newCart.calculateTotal(newCart.appliedCoupon ?? undefined);
    return newCart;
  }

  /**
   * Labels to show in cart UI / seating modal: rich display strings first, then API labels, then seat references.
   */
  static getSessionSeatLabelsForUi(session: CartSession): string[] | null | undefined {
    if (session.seatDisplayLabels?.length) {
      return session.seatDisplayLabels;
    }
    if (session.seatLabels?.length) {
      return session.seatLabels;
    }
    return session.seats;
  }

  /**
   * Compact labels for inline cart UI: when every seat shares the same label, returns a single entry
   * (quantity is shown separately in the ticket counter).
   */
  static getCompactSessionSeatLabelsForUi(session: CartSession): string[] {
    const labels = CartUtil.getSessionSeatLabelsForUi(session);
    if (!labels?.length) {
      return [];
    }

    const uniqueLabels = [...new Set(labels)];
    if (uniqueLabels.length === 1) {
      return uniqueLabels;
    }

    return labels;
  }

  /**
   * One card per seat of a real-time line, priced by the map. The OneBox widget labels a numbered seat
   * "sector, row, seat" (the row may be empty), so those three parts become the card name and position.
   * Any other label (an unnumbered sector, or "tariff, rate" when the seat has no sector) is the name alone.
   * Empty for every other line, and for a real-time line whose prices and labels do not pair up.
   */
  static getRealTimeSeatCards(session: CartSession): RealTimeSeatCard[] {
    const prices = session.seatPrices ?? [];
    const labels = CartUtil.getSessionSeatLabelsForUi(session) ?? [];
    if (prices.length === 0 || prices.length !== labels.length) {
      return [];
    }
    return labels.map((label: string, index: number) => {
      const [sector, row, seat, ...rest] = label.split(',').map((part: string) => part.trim());
      const isNumberedSeat = rest.length === 0 && seat !== undefined && sector !== '' && seat !== '';
      return isNumberedSeat
        ? { name: sector, price: prices[index], row: row === '' ? null : row, seat }
        : { name: label, price: prices[index], row: null, seat: null };
    });
  }

  static getPartySizeWarnings(sessions: CartSession[], translate: TranslateService): string[] {
    return CartSession.getGroupRuleViolations(sessions, 'bucketed').map(violation => {
      const messageKey = violation.kind === 'min' ? 'boxOffice.cart.partySizeMinimumError' : 'boxOffice.cart.partySizeMaximumError';
      return translate.instant(messageKey, { count: violation.required });
    });
  }
}
