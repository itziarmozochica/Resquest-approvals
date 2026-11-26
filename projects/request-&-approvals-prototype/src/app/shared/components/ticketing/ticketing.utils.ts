import { unitPriceWithAdjustment } from '../../cart/utils/cart-adjustment.util';
import { CartSession } from '../../models/cart/cart-session.model';
import { Cart } from '../../models/cart/cart.model';
import { SessionTypeDiscounts } from '../../models/cart/session-type-discounts.model';
import { Money } from '../../models/money.model';
import { RegularSessionAvailabilitySummaryByDate } from '../../models/session-availability/regular-session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDate } from '../../models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailability } from '../../models/session-availability/session-availability.model';
import { SeatInfo } from '../../seating-selector/components/seating-selector/__data__/seat-info.model';
import { SeatingProviderEnum } from '../../seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { OngoingSessionUtil } from '../../utils/ongoing-session.util';
import { sessionTypeDiscountFor } from '../../utils/session-type-discount.util';

export type SessionCartContext = { datetime: string; session: SessionAvailability };

/** Normalizes a datetime string for use as a `sessionItemsByDatetime` map key (matches existing cart behavior). */
export function normalizeCartDatetime(isoDatetime: string): string {
  return new Date(isoDatetime).toISOString().replace(/.\d+Z$/g, 'Z');
}

function seatInfoToCartDisplayLabel(seatInfo: SeatInfo): string {
  return seatInfo.displayedLabel?.trim() || seatInfo.seatLabel?.trim() || seatInfo.seatReference;
}

/**
 * Unit price of a seated line whose seats carry the price the real-time (OneBox) map reported, so the
 * line total `Cart.calculateTotal` derives from `units × unitPrice` equals the sum of the seat prices.
 * With seats of different prices it is an average that matches no seat; the customer-screen cart item is
 * the one place that shows it per unit. `null` when any seat has no price, which is every classic map.
 */
function realTimeUnitPrice(seatInfos: SeatInfo[], units: number): Money | null {
  const prices = seatInfos.map((seatInfo: SeatInfo) => seatInfo.itemPrice);
  if (units <= 0 || prices.length === 0 || !prices.every((price): price is Money => price != null)) {
    return null;
  }
  const total = prices.reduce((sum: number, price: Money) => sum + price.amount, 0);
  return new Money(total / units, prices[0].currency);
}

/**
 * Maps session id → slot datetime + availability for primary selected slot and ongoing multi-day buckets.
 * Primary slot entries win when the same session id appears in an ongoing bucket (user-selected datetime first).
 */
export function buildSessionCartContextMap(
  primarySession: SessionAvailabilitySummaryByDate | null,
  ongoingBuckets: RegularSessionAvailabilitySummaryByDate[],
): Map<number, SessionCartContext> {
  const map = new Map<number, SessionCartContext>();
  if (primarySession?.selectedDatetime) {
    const { datetime } = primarySession.selectedDatetime;
    for (const s of primarySession.selectedDatetime.sessionAvailabilityList) {
      map.set(s.id, { datetime, session: s });
    }
  }
  for (const bucket of ongoingBuckets) {
    for (const slot of bucket.sessionAvailabilityByDatetimeList) {
      for (const s of slot.sessionAvailabilityList) {
        if (!map.has(s.id)) {
          map.set(s.id, { datetime: slot.datetime, session: s });
        }
      }
    }
  }
  return map;
}

export function generateCart({
  allowMultiTimeSlotSelection = false,
  cart = new Cart(),
  currentPlanIds = [],
  sessionTypeDiscounts = null,
  productSessions = [],
  realTimeLineName,
  seatingHoldTokensBySessionId = new Map<string, string>(),
  seatingProvider,
  selectedTickets,
  session,
  timezone,
  sessionContextBySessionId,
}: {
  selectedTickets: {
    bySeating: Map<string, SeatInfo[]>;
    bySessionId: Map<string, number>;
    bySessionType: Map<string, number>;
  };
  session: SessionAvailabilitySummaryByDate | null;
  timezone: string;
  allowMultiTimeSlotSelection?: boolean;
  cart?: Cart;
  currentPlanIds?: number[];
  sessionTypeDiscounts?: SessionTypeDiscounts | null;
  productSessions?: SessionAvailability[];
  realTimeLineName?: string;
  seatingHoldTokensBySessionId?: Map<string, string>;
  seatingProvider?: SeatingProviderEnum;
  sessionContextBySessionId?: Map<number, SessionCartContext>;
}): Cart | null {
  return generateCartImpl({
    allowMultiTimeSlotSelection,
    cart,
    currentPlanIds,
    sessionTypeDiscounts,
    productSessions,
    realTimeLineName,
    seatingHoldTokensBySessionId,
    seatingProvider,
    selectedTickets,
    session,
    timezone,
    sessionContextBySessionId,
  });
}

/**
 * Merges the cart lines belonging to plans other than `currentPlanId` from `previousCart` into
 * `rebuiltCart`, deduplicating by datetime + plan + venue + session + start.
 *
 * `generateCart()` rebuilds `sessionItemsByDatetime` from the *current* plan's selection only (it
 * wipes the map whenever `allowMultiTimeSlotSelection` is off), so every caller that keeps a
 * multiplan cart alive has to re-append the other plans' lines on top of the rebuild. Callers must
 * gate this on the multiplan seating flow themselves — B2BO-8391.
 *
 * Returns `rebuiltCart` untouched when `previousCart` holds nothing from another plan, so callers
 * can compare references to know whether a merge happened.
 */
export function mergeCartSessionsFromOtherPlans(rebuiltCart: Cart, previousCart: Cart, currentPlanId: number): Cart {
  const sessionItemsByDatetimeFromOtherPlans = new Map<string, CartSession[]>();
  previousCart.sessionItemsByDatetime.forEach((sessions, datetime) => {
    const sessionsFromOtherPlans = sessions.filter(
      session => session.mainPlanId !== undefined && session.mainPlanId !== null && session.mainPlanId !== currentPlanId,
    );
    if (sessionsFromOtherPlans.length > 0) {
      sessionItemsByDatetimeFromOtherPlans.set(datetime, sessionsFromOtherPlans);
    }
  });
  if (sessionItemsByDatetimeFromOtherPlans.size === 0) {
    return rebuiltCart;
  }

  const mergedCart = rebuiltCart.clone();
  const mergedSessionItemsByDatetime = new Map<string, CartSession[]>();
  const mergedLineKeys = new Set<string>();
  const appendSessions = (sessionItemsByDatetime: Map<string, CartSession[]>): void => {
    sessionItemsByDatetime.forEach((sessions, datetime) => {
      const mergedSessions = mergedSessionItemsByDatetime.get(datetime) ?? [];
      for (const session of sessions) {
        const lineKey = `${datetime}|${session.mainPlanId ?? ''}|${session.sessionAddressId ?? ''}|${session.sessionId ?? ''}|${session.sessionStartAt ?? ''}`;
        if (mergedLineKeys.has(lineKey)) {
          continue;
        }
        mergedLineKeys.add(lineKey);
        mergedSessions.push(session.clone());
      }
      if (mergedSessions.length > 0) {
        mergedSessionItemsByDatetime.set(datetime, mergedSessions);
      }
    });
  };
  appendSessions(rebuiltCart.sessionItemsByDatetime);
  appendSessions(sessionItemsByDatetimeFromOtherPlans);

  mergedCart.sessionItemsByDatetime = mergedSessionItemsByDatetime;
  mergedCart.hasSeating = rebuiltCart.hasSeating || previousCart.hasSeating;
  mergedCart.calculateTotal(mergedCart.appliedCoupon ?? undefined);
  return mergedCart;
}

/**
 * The other plans' lines on their own, for when the current plan's rebuild came back empty.
 *
 * `generateCart()` returns `null` as soon as the plan on screen has no selected tickets, which in
 * the multiplan seating flow happens on something as ordinary as swapping one seat for another:
 * removing the last seat empties the selection maps. Callers that keep a multiplan cart alive must
 * not take that `null` at face value, or the other plans lose their lines and their seats stay held
 * at the provider with nothing left to check out — B2BO-8391.
 *
 * Returns `null` when the previous cart holds nothing from another plan, so a single-plan cart still
 * empties the way it always did.
 */
export function cartWithOnlyOtherPlanSessions(previousCart: Cart, currentPlanId: number): Cart | null {
  const emptyBase = previousCart.clone();
  emptyBase.sessionItemsByDatetime = new Map();
  const otherPlansCart = mergeCartSessionsFromOtherPlans(emptyBase, previousCart, currentPlanId);
  return otherPlansCart.sessionItemsByDatetime.size > 0 ? otherPlansCart : null;
}

/**
 * The hold tokens belonging to sessions whose seated lines are still in the cart.
 *
 * A plan or place change tears the seating map down and, with it, the per-session hold tokens. That
 * is right when the cart goes too, but a preserved multiplan cart still holds the other plans' seats,
 * and each map issues its own token: dropping them leaves those lines falling back to the new plan's
 * token, which the backend rejects with "Problem assigning seats" (802) — B2BO-8391.
 */
export function seatingHoldTokensForSeatedCartLines(
  holdTokensBySessionId: Map<string, string>,
  carts: ReadonlyArray<Cart | null | undefined>,
): Map<string, string> {
  const seatedSessionIds = new Set<string>();
  for (const cart of carts) {
    cart?.sessionItemsByDatetime?.forEach(sessions => {
      for (const session of sessions) {
        if ((session.seats?.length ?? 0) > 0) {
          seatedSessionIds.add(session.sessionId.toString());
        }
      }
    });
  }

  const preservedTokens = new Map<string, string>();
  holdTokensBySessionId.forEach((holdToken, sessionId) => {
    if (seatedSessionIds.has(sessionId)) {
      preservedTokens.set(sessionId, holdToken);
    }
  });
  return preservedTokens;
}

export function planHasSeatings(sessionSummaries: RegularSessionAvailabilitySummaryByDate[]): boolean {
  return sessionSummaries.some(summaryByDate =>
    summaryByDate.sessionAvailabilityByDatetimeList.some(datetimeAvailability =>
      datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null),
    ),
  );
}

function generateCartImpl({
  allowMultiTimeSlotSelection = false,
  cart = new Cart(),
  currentPlanIds = [],
  sessionTypeDiscounts = null,
  productSessions = [],
  realTimeLineName,
  seatingHoldTokensBySessionId = new Map<string, string>(),
  seatingProvider,
  selectedTickets,
  session,
  timezone,
  sessionContextBySessionId,
}: {
  selectedTickets: {
    bySeating: Map<string, SeatInfo[]>;
    bySessionId: Map<string, number>;
    bySessionType: Map<string, number>;
  };
  session: SessionAvailabilitySummaryByDate | null;
  timezone: string;
  allowMultiTimeSlotSelection?: boolean;
  cart?: Cart;
  currentPlanIds?: number[];
  sessionTypeDiscounts?: SessionTypeDiscounts | null;
  productSessions?: SessionAvailability[];
  realTimeLineName?: string;
  seatingHoldTokensBySessionId?: Map<string, string>;
  seatingProvider?: SeatingProviderEnum;
  sessionContextBySessionId?: Map<number, SessionCartContext>;
}): Cart | null {
  let hasSeating = false;
  const ongoingMultiDaySessionIds = ongoingSessionIdsIn(sessionContextBySessionId, session, timezone);

  const selectedProductSessions: SessionAvailability[] = [];
  selectedTickets.bySessionId.forEach((_, sessionId) => {
    const ps = productSessions.find(p => p.id === parseInt(sessionId, 10));
    if (ps) {
      selectedProductSessions.push(ps);
    }
  });

  const hasOngoingSelection = [...selectedTickets.bySessionId].some(([sessionIdStr, units]) => {
    const sessionId = Number(sessionIdStr);
    return units > 0 && !Number.isNaN(sessionId) && ongoingMultiDaySessionIds.has(sessionId);
  });
  const hasNoTicketsSelected = !hasOngoingSelection && (selectedTickets.bySessionId.size === 0 || selectedTickets.bySessionType.size === 0);
  const hasExistingCartItems = allowMultiTimeSlotSelection && (cart.sessionItemsByDatetime?.size ?? 0) > 0;

  if (hasNoTicketsSelected) {
    if (hasExistingCartItems) {
      return removeCurrentPlanSessionsFromCart(cart, session, timezone, currentPlanIds);
    }
    return null;
  }

  if (!session || !session.selectedDatetime) {
    const hasOnlyShopProducts =
      selectedProductSessions.length > 0 &&
      selectedProductSessions.every(ps => ps.sessionType?.isShopProduct === true) &&
      selectedProductSessions.length === selectedTickets.bySessionId.size;
    if (!hasOnlyShopProducts) {
      return null;
    }
  }

  const useSessionContext = (sessionContextBySessionId?.size ?? 0) > 0;
  const primaryList = session?.selectedDatetime?.sessionAvailabilityList ?? [];
  const allSessionAvailabilities = [...selectedProductSessions, ...primaryList];

  const ticketSessionsByDatetime = new Map<string, CartSession[]>();
  const flatSessions: CartSession[] = [];

  const pushTicketSession = (cartSession: CartSession, datetimeRaw: string): void => {
    flatSessions.push(cartSession);
    const key = normalizeCartDatetime(datetimeRaw);
    const list = ticketSessionsByDatetime.get(key) ?? [];
    list.push(cartSession);
    ticketSessionsByDatetime.set(key, list);
  };

  const makeCartSession = (sessionAvailability: SessionAvailability, units: number): CartSession => {
    const cartSession = new CartSession(sessionAvailability.id, units);
    cartSession.sessionName = sessionAvailability.name;
    cartSession.unitPrice = sessionAvailability.ticketPrice;
    cartSession.surchargePerTicket = sessionAvailability.surchargePerTicket;
    cartSession.sessionType = sessionAvailability.sessionType;
    cartSession.sharedAvailabilityRule = sessionAvailability.sharedAvailabilityRule;
    cartSession.isPack = sessionAvailability.isPack;
    cartSession.mainPlanId = sessionAvailability.mainPlanId ?? currentPlanIds?.[0];
    const sessionTypeDiscount = sessionTypeDiscountFor(sessionTypeDiscounts, cartSession.mainPlanId, sessionAvailability.sessionType?.id);
    if (sessionTypeDiscount !== null && sessionAvailability.ticketPrice != null) {
      cartSession.catalogUnitPrice = sessionAvailability.ticketPrice;
      cartSession.unitPrice = unitPriceWithAdjustment(sessionTypeDiscount, sessionAvailability.ticketPrice);
    }
    cartSession.sessionTimezone = timezone;
    cartSession.sessionAddressId = sessionAvailability.venueId;
    if (sessionAvailability.seating && sessionAvailability.seating.poolId) {
      hasSeating = true;
      cartSession.hasSeating = true;
      if (selectedTickets.bySeating.size > 0) {
        const seatInfos: SeatInfo[] | undefined = selectedTickets.bySeating.get(sessionAvailability.id.toString());
        cartSession.seats = seatInfos ? seatInfos.map(seatInfo => seatInfo.seatReference) : [];
        cartSession.seatLabels =
          seatInfos && !seatInfos.some(seatInfo => seatInfo.seatLabel === undefined) ? seatInfos.map(seatInfo => seatInfo.seatLabel!) : [];
        if (seatInfos && seatInfos.length > 0) {
          cartSession.seatDisplayLabels = seatInfos.map(seatInfo => seatInfoToCartDisplayLabel(seatInfo));
          const realTimePrice = realTimeUnitPrice(seatInfos, units);
          if (realTimePrice) {
            // The map price is final, so the local surcharge must not be added on top of it. Zero, not
            // undefined: the dual-screen cart reads `surchargePerTicket.amount` unguarded.
            cartSession.unitPrice = realTimePrice;
            cartSession.surchargePerTicket = new Money(0, realTimePrice.currency);
            cartSession.seatPrices = seatInfos
              .map((seatInfo: SeatInfo) => seatInfo.itemPrice)
              .filter((price): price is Money => price != null);
            // Every real-time seat sits on the timeslot's first seated session, whose name is not the
            // seats' tariff (the map does not report it), so the line takes the caller's neutral name.
            if (realTimeLineName) {
              cartSession.sessionName = realTimeLineName;
            }
          }
        }
        cartSession.seatingProvider = seatingProvider;
        const holdToken = seatingHoldTokensBySessionId.get(sessionAvailability.id.toString());
        if (holdToken) {
          cartSession.seatingHoldToken = holdToken;
        }
      }
    }
    return cartSession;
  };

  const takesNameCountOver = (carriers: Map<string, number>, name: string, hasOwnCount: boolean): boolean => {
    const carrierId = carriers.get(name);
    if (carrierId === undefined) {
      return true;
    }
    const carrierHasOwnCount = (selectedTickets.bySessionId.get(carrierId.toString()) ?? 0) > 0;
    return hasOwnCount && !carrierHasOwnCount;
  };

  if (useSessionContext) {
    const nameCountCarrierSessionIds = new Map<string, number>();
    selectedTickets.bySessionId.forEach((unitsBySessionId, sessionIdStr) => {
      const sessionId = parseInt(sessionIdStr, 10);
      if (Number.isNaN(sessionId) || allowMultiTimeSlotSelection || ongoingMultiDaySessionIds.has(sessionId)) {
        return;
      }
      const product = productSessions.find(ps => ps.id === sessionId);
      const availability = product ?? sessionContextBySessionId!.get(sessionId)?.session ?? primaryList.find(s => s.id === sessionId);
      if (!availability || availability.sessionType?.isShopProduct) {
        return;
      }
      if (takesNameCountOver(nameCountCarrierSessionIds, availability.name, unitsBySessionId > 0)) {
        nameCountCarrierSessionIds.set(availability.name, sessionId);
      }
    });
    selectedTickets.bySessionId.forEach((unitsBySessionId, sessionIdStr) => {
      const sessionId = parseInt(sessionIdStr, 10);
      if (Number.isNaN(sessionId)) {
        return;
      }
      const product = productSessions.find(ps => ps.id === sessionId);
      const carriesProductNameCount =
        product?.sessionType?.isShopProduct || nameCountCarrierSessionIds.get(product?.name ?? '') === sessionId;
      const unitsBySessionType = selectedTickets.bySessionType.get(product?.name ?? '') ?? 0;
      const units =
        allowMultiTimeSlotSelection || ongoingMultiDaySessionIds.has(sessionId)
          ? unitsBySessionId
          : carriesProductNameCount
            ? unitsBySessionType || unitsBySessionId
            : 0;

      if (product) {
        if (units > 0) {
          const cartSession = makeCartSession(product, units);
          if (product.sessionType?.isShopProduct) {
            flatSessions.push(cartSession);
          } else {
            const ctx = sessionContextBySessionId!.get(sessionId);
            const datetimeRaw = ctx?.datetime ?? session?.selectedDatetime?.datetime ?? new Date().toISOString();
            pushTicketSession(cartSession, datetimeRaw);
          }
        }
        return;
      }

      const ctx = sessionContextBySessionId!.get(sessionId);
      const sessionAvailability = ctx?.session ?? primaryList.find(s => s.id === sessionId);
      if (!sessionAvailability) {
        return;
      }
      const unitsBySessionTypeNonProduct = selectedTickets.bySessionType.get(sessionAvailability.name) ?? 0;
      const carriesNameCount =
        sessionAvailability.sessionType?.isShopProduct || nameCountCarrierSessionIds.get(sessionAvailability.name) === sessionId;
      const unitsNonProduct =
        allowMultiTimeSlotSelection || ongoingMultiDaySessionIds.has(sessionId)
          ? unitsBySessionId
          : carriesNameCount
            ? unitsBySessionTypeNonProduct || unitsBySessionId
            : 0;
      if (unitsNonProduct <= 0 || sessionAvailability.sessionType?.isShopProduct) {
        return;
      }
      const datetimeRaw = ctx?.datetime ?? session?.selectedDatetime?.datetime;
      if (!datetimeRaw) {
        return;
      }
      pushTicketSession(makeCartSession(sessionAvailability, unitsNonProduct), datetimeRaw);
    });
  } else {
    const nameCountCarrierSessionIds = new Map<string, number>();
    allSessionAvailabilities.forEach((sessionAvailability: SessionAvailability) => {
      if (
        allowMultiTimeSlotSelection ||
        ongoingMultiDaySessionIds.has(sessionAvailability.id) ||
        sessionAvailability.sessionType?.isShopProduct
      ) {
        return;
      }
      const hasOwnCount = (selectedTickets.bySessionId.get(sessionAvailability.id.toString()) ?? 0) > 0;
      if (takesNameCountOver(nameCountCarrierSessionIds, sessionAvailability.name, hasOwnCount)) {
        nameCountCarrierSessionIds.set(sessionAvailability.name, sessionAvailability.id);
      }
    });
    allSessionAvailabilities.forEach((sessionAvailability: SessionAvailability) => {
      const unitsBySessionId = selectedTickets.bySessionId.get(sessionAvailability.id.toString()) ?? 0;
      const unitsBySessionType = selectedTickets.bySessionType.get(sessionAvailability.name) ?? 0;
      const carriesNameCount =
        sessionAvailability.sessionType?.isShopProduct ||
        nameCountCarrierSessionIds.get(sessionAvailability.name) === sessionAvailability.id;
      const units =
        allowMultiTimeSlotSelection || ongoingMultiDaySessionIds.has(sessionAvailability.id)
          ? unitsBySessionId
          : carriesNameCount
            ? unitsBySessionType || unitsBySessionId
            : 0;

      if (units > 0) {
        const cartSession = makeCartSession(sessionAvailability, units);
        if (sessionAvailability.sessionType?.isShopProduct) {
          flatSessions.push(cartSession);
        } else if (session?.selectedDatetime?.datetime) {
          pushTicketSession(cartSession, session.selectedDatetime.datetime);
        }
      }
    });
  }

  const shopProductCartSessions = flatSessions.filter(s => s.sessionType?.isShopProduct);
  const ticketSessions = flatSessions.filter(s => !s.sessionType?.isShopProduct);

  if (ticketSessions.length === 0 && shopProductCartSessions.length === 0 && hasExistingCartItems) {
    return removeCurrentPlanSessionsFromCart(cart, session, timezone, currentPlanIds);
  }

  const datetime =
    session?.selectedDatetime?.datetime != null
      ? normalizeCartDatetime(session.selectedDatetime.datetime)
      : new Date().toISOString().replace(/.\d+Z$/g, 'Z');

  const newCart = cart.clone();
  if (!allowMultiTimeSlotSelection || !newCart.sessionItemsByDatetime || newCart.sessionItemsByDatetime.size === 0) {
    newCart.sessionItemsByDatetime = new Map();
  }

  const multipleTicketDatetimes = ticketSessionsByDatetime.size > 1;

  if (allowMultiTimeSlotSelection) {
    if (multipleTicketDatetimes) {
      for (const [dtKey, newForKey] of ticketSessionsByDatetime) {
        const merged = mergeSessionsForDatetime(newCart.sessionItemsByDatetime.get(dtKey), newForKey);
        newCart.sessionItemsByDatetime.set(dtKey, merged);
      }
    } else if (ticketSessions.length > 0) {
      const singleKey = ticketSessionsByDatetime.size === 1 ? [...ticketSessionsByDatetime.keys()][0]! : datetime;
      const sessionsForKey = ticketSessionsByDatetime.size === 1 ? ticketSessionsByDatetime.get(singleKey)! : ticketSessions;
      const mergedSessions = mergeSessionsForDatetime(newCart.sessionItemsByDatetime.get(singleKey), sessionsForKey);
      newCart.sessionItemsByDatetime.set(singleKey, mergedSessions);
    }

    if (shopProductCartSessions.length > 0) {
      const existingProducts = newCart.sessionItemsByDatetime.get('products') ?? [];
      const mergedProducts = mergeProductSessions(existingProducts, shopProductCartSessions);
      newCart.sessionItemsByDatetime.set('products', mergedProducts);
    }
  } else {
    if (multipleTicketDatetimes) {
      for (const [dtKey, newForKey] of ticketSessionsByDatetime) {
        newCart.sessionItemsByDatetime.set(dtKey, newForKey);
      }
      if (shopProductCartSessions.length > 0) {
        const existingPrimary = newCart.sessionItemsByDatetime.get(datetime) ?? [];
        newCart.sessionItemsByDatetime.set(datetime, [...existingPrimary, ...shopProductCartSessions]);
      }
    } else {
      if (ticketSessions.length > 0) {
        const [onlyTicketDatetime] = ticketSessionsByDatetime.keys();
        const combinedDatetime = ticketSessionsByDatetime.size === 1 && onlyTicketDatetime !== undefined ? onlyTicketDatetime : datetime;
        newCart.sessionItemsByDatetime.set(combinedDatetime, [...ticketSessions]);
      }
      if (shopProductCartSessions.length > 0) {
        const existingForSelectedDatetime = newCart.sessionItemsByDatetime.get(datetime) ?? [];
        newCart.sessionItemsByDatetime.set(datetime, [...existingForSelectedDatetime, ...shopProductCartSessions]);
      }
    }
  }

  newCart.timezone = timezone;
  newCart.hasSeating = hasSeating;
  newCart.calculateTotal(newCart.appliedCoupon ?? undefined);
  return newCart;
}

function ongoingSessionIdsIn(
  sessionContextBySessionId: Map<number, SessionCartContext> | undefined,
  session: SessionAvailabilitySummaryByDate | null,
  timezone: string,
): Set<number> {
  const ongoingSessionIds = new Set<number>();
  if (sessionContextBySessionId === undefined || session === null) {
    return ongoingSessionIds;
  }
  sessionContextBySessionId.forEach((context, sessionId) => {
    if (OngoingSessionUtil.isSessionOngoingOnDate(context.session, session.date, timezone)) {
      ongoingSessionIds.add(sessionId);
    }
  });
  return ongoingSessionIds;
}

function removeCurrentPlanSessionsFromCart(
  cart: Cart,
  sessionAvailabilitySummaryByDate: SessionAvailabilitySummaryByDate | null,
  timezone: string,
  currentPlanIds: number[],
): Cart | null {
  if (!sessionAvailabilitySummaryByDate?.selectedDatetime?.datetime) {
    return cart.clone();
  }

  const datetime = normalizeCartDatetime(sessionAvailabilitySummaryByDate.selectedDatetime.datetime);
  const newCart = cart.clone();
  const existingSessions = newCart.sessionItemsByDatetime.get(datetime);

  if (!existingSessions?.length) {
    return newCart;
  }

  if (currentPlanIds.length === 0) {
    newCart.sessionItemsByDatetime.delete(datetime);

    if (newCart.sessionItemsByDatetime.size === 0) {
      return null;
    }

    newCart.timezone = timezone;
    newCart.calculateTotal(newCart.appliedCoupon ?? undefined);
    return newCart;
  }

  const currentPlanIdsSet = new Set(currentPlanIds);
  const selectedVenueId = sessionAvailabilitySummaryByDate.selectedVenueId;
  const sessionsFromOtherPlans = existingSessions.filter(s => {
    if (s.sessionType?.isShopProduct) {
      return false;
    }
    if (s.mainPlanId === undefined || !currentPlanIdsSet.has(s.mainPlanId)) {
      return true;
    }
    if (selectedVenueId == null) {
      return false;
    }
    return s.sessionAddressId !== selectedVenueId;
  });

  if (sessionsFromOtherPlans.length > 0) {
    newCart.sessionItemsByDatetime.set(datetime, sessionsFromOtherPlans);
  } else {
    newCart.sessionItemsByDatetime.delete(datetime);
  }

  if (newCart.sessionItemsByDatetime.size === 0) {
    return null;
  }

  newCart.timezone = timezone;
  newCart.calculateTotal(newCart.appliedCoupon ?? undefined);
  return newCart;
}

function mergeSessionsForDatetime(existingSessions: CartSession[] | undefined, newSessions: CartSession[]): CartSession[] {
  if (!existingSessions?.length) {
    return newSessions;
  }

  const newTicketPlanVenueKeys = new Set(
    newSessions
      .filter(s => !s.sessionType?.isShopProduct && s.mainPlanId !== undefined)
      .map(s => `${s.mainPlanId}|${s.sessionAddressId ?? ''}`),
  );

  return replaceSessionsInPlace(existingSessions, newSessions, s => {
    if (s.sessionType?.isShopProduct) {
      return true;
    }
    return s.mainPlanId !== undefined && newTicketPlanVenueKeys.has(`${s.mainPlanId}|${s.sessionAddressId ?? ''}`);
  });
}

function mergeProductSessions(existingProducts: CartSession[], newProducts: CartSession[]): CartSession[] {
  const newProductIds = new Set(newProducts.map(p => p.sessionId));
  const validNewProducts = newProducts.filter(p => p.units > 0);

  return replaceSessionsInPlace(existingProducts, validNewProducts, p => newProductIds.has(p.sessionId));
}

/**
 * Puts each rebuilt line where the line of the same session was, so it keeps its place in the cart, and drops
 * the replaced lines that were not rebuilt. A new line goes right before the next rebuilt line that was
 * already in the cart, which keeps the rebuild's own order for a fresh selection, or at the end when none follows.
 */
function replaceSessionsInPlace(
  existingSessions: CartSession[],
  newSessions: CartSession[],
  isReplaced: (session: CartSession) => boolean,
): CartSession[] {
  const replacedSessionIds = new Set(existingSessions.filter(isReplaced).map(session => session.sessionId));
  const { newSessionsBeforeSessionId, trailingNewSessions } = newSessions.reduce(
    (placement, session) =>
      replacedSessionIds.has(session.sessionId)
        ? {
            newSessionsBeforeSessionId: new Map([
              ...placement.newSessionsBeforeSessionId,
              [session.sessionId, placement.trailingNewSessions],
            ]),
            trailingNewSessions: [],
          }
        : { ...placement, trailingNewSessions: [...placement.trailingNewSessions, session] },
    { newSessionsBeforeSessionId: new Map<number, CartSession[]>(), trailingNewSessions: [] as CartSession[] },
  );
  const rebuiltSessionById = new Map(
    newSessions.filter(session => replacedSessionIds.has(session.sessionId)).map(session => [session.sessionId, session]),
  );
  const mergedSessions = existingSessions.flatMap((session, index) => {
    if (!isReplaced(session)) {
      return [session];
    }
    const isFirstLineOfSession = existingSessions.findIndex(other => isReplaced(other) && other.sessionId === session.sessionId) === index;
    const rebuiltSession = rebuiltSessionById.get(session.sessionId);
    return isFirstLineOfSession && rebuiltSession ? [...(newSessionsBeforeSessionId.get(session.sessionId) ?? []), rebuiltSession] : [];
  });
  return [...mergedSessions, ...trailingNewSessions];
}
