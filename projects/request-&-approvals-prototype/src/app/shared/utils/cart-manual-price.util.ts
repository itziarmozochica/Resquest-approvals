import { Decimal } from 'decimal.js';

import { CartAdjustmentPriceCalculation, CartAdjustmentPriceOperation } from '../cart/models/cart-adjustment-price.model';
import {
  CartB2bEmployeeRequestBody,
  CartManualPriceRequestBody,
  CartSessionManualPrice,
  CartSessionManualPriceAuthor,
  CartSessionManualPriceData,
  CartSessionManualPriceDraft,
  CartSessionManualPriceEntry,
  manualPriceAmountLimit,
  manualPriceDecimalPlaces,
  ManualPriceEntryError,
  ManualPriceEntryErrors,
  manualPriceRefusalCodes,
  manualUnitPriceLimit,
} from '../models/cart/cart-session-manual-price.model';
import { CartSession } from '../models/cart/cart-session.model';
import { Cart, countTicketsPricingTheLine } from '../models/cart/cart.model';
import { Money } from '../models/money.model';
import { User } from '../models/user/user.model';
import { FeatureFlags } from '../optimizely/feature-flags';
import { type OptimizelyService } from '../optimizely/optimizely.service';
import { Permissions } from '../services/user/permissions';
import { type UserService } from '../services/user/user.service';

const percentageLimit = 100;

/** The manual price per ticket: catalogue ± amount, or catalogue × (1 ∓ amount / 100), rounded half up to the cent. */
export function computeManualUnitPrice(catalogUnitPrice: Money, entry: CartSessionManualPriceEntry): Money {
  const catalogue = new Decimal(catalogUnitPrice.amount);
  const change =
    entry.calculation === CartAdjustmentPriceCalculation.PERCENTAGE
      ? catalogue.mul(entry.amount).div(percentageLimit)
      : new Decimal(entry.amount);
  const unitPrice = entry.operation === CartAdjustmentPriceOperation.SUBTRACT ? catalogue.minus(change) : catalogue.plus(change);

  return new Money(unitPrice.toDecimalPlaces(manualPriceDecimalPlaces, Decimal.ROUND_HALF_UP).toNumber(), catalogUnitPrice.currency);
}

/** The amount typed in the editor: a number field reports text, so empty or non-numeric input is no amount. */
export function parseManualPriceAmount(value: number | string | null): number | null {
  if (value === null || value === '') {
    return null;
  }
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function validateManualPriceDraft(catalogUnitPrice: Money, draft: CartSessionManualPriceDraft): ManualPriceEntryErrors {
  return {
    amount: validateAmount(catalogUnitPrice, draft),
    concept: draft.concept.trim().length === 0 ? ManualPriceEntryError.ConceptRequired : null,
  };
}

export function hasManualPriceEntryErrors(errors: ManualPriceEntryErrors): boolean {
  return errors.amount !== null || errors.concept !== null;
}

/**
 * A ticket type the editor can price: not seated, not a pack and not an add-on. Shop products (food, beverage and merchandise) are
 * priced like any other ticket type.
 */
export function canSetManualPrice(session: CartSession): boolean {
  const hasAssignedSeats = (session.seats?.length ?? 0) > 0;
  const isSeated = session.hasSeating === true || session.seatingProvider != null || hasAssignedSeats;

  return !isSeated && session.isPack !== true && session.sessionType?.isAddOn !== true;
}

/**
 * Returns a new cart where the line `sessionId` of the slot `datetimeKey` carries the manual price computed from its catalogue
 * price. Returns the same cart when the line is missing or has no price to start from.
 */
export function applyManualPrice(
  cart: Cart,
  datetimeKey: string,
  sessionId: number,
  { concept, entry }: { concept: string; entry: CartSessionManualPriceEntry },
  setBy: CartSessionManualPriceAuthor | null = null,
): Cart {
  const line = findLine(cart, datetimeKey, sessionId);
  const catalogUnitPrice = line?.catalogUnitPrice ?? line?.unitPrice ?? null;
  if (catalogUnitPrice == null) {
    return cart;
  }

  const unitPrice = computeManualUnitPrice(catalogUnitPrice, entry);
  return updateLine(cart, datetimeKey, sessionId, (session: CartSession) => {
    session.catalogUnitPrice = catalogUnitPrice;
    session.isManualPriceClearPending = false;
    session.manualPrice = { concept: concept.trim(), entry, setBy: setBy ?? session.manualPrice?.setBy ?? null, unitPrice };
    session.unitPrice = unitPrice;
  });
}

/**
 * Returns a new cart where the line `sessionId` of the slot `datetimeKey` is back at its catalogue price. The clear stays pending
 * until a response without a manual price for the line confirms it.
 */
export function clearManualPrice(cart: Cart, datetimeKey: string, sessionId: number): Cart {
  const line = findLine(cart, datetimeKey, sessionId);
  if (line?.manualPrice == null) {
    return cart;
  }

  return updateLine(cart, datetimeKey, sessionId, (session: CartSession) => {
    session.isManualPriceClearPending = true;
    session.manualPrice = null;
    session.unitPrice = session.catalogUnitPrice ?? session.unitPrice;
  });
}

/**
 * Returns a copy of `toCart` whose lines keep the manual price state of the same session in `fromCart`, so a cart rebuilt from the
 * ticket selector after a quantity change keeps the price per ticket and its entry. The fee of the last response travels with a
 * manual price, since the catalogue fee of the selector does not apply to it.
 */
export function carryManualPrices(fromCart: Cart | null | undefined, toCart: Cart): Cart {
  const heldSessions = new Map(
    Array.from(fromCart?.sessionItemsByDatetime.values() ?? [])
      .flat()
      .filter((session: CartSession) => holdsManualPriceState(session))
      .map((session: CartSession) => [session.sessionId, session]),
  );
  if (heldSessions.size === 0) {
    return toCart;
  }

  const newCart = toCart.clone();
  newCart.sessionItemsByDatetime.forEach((sessions: CartSession[]) =>
    sessions.forEach((session: CartSession) => {
      const heldSession = heldSessions.get(session.sessionId);
      if (heldSession === undefined) {
        return;
      }
      session.catalogUnitPrice = heldSession.catalogUnitPrice ?? session.unitPrice;
      session.isManualPriceClearPending = heldSession.isManualPriceClearPending;
      session.manualPrice = heldSession.manualPrice;
      if (heldSession.manualPrice != null) {
        session.unitPrice = heldSession.manualPrice.unitPrice;
        session.surchargePerTicket = heldSession.surchargePerTicket;
      } else if (heldSession.isManualPriceClearPending === true && session.catalogUnitPrice != null) {
        session.unitPrice = session.catalogUnitPrice;
      }
    }),
  );
  newCart.timezone = toCart.timezone;
  newCart.calculateTotal(newCart.appliedCoupon ?? undefined);
  return newCart;
}

/** True when a ticket type carries a manual price; a pending clear does not count (spec 6.2, `hasManualPrices`). */
export function hasManualPrices(cart: Cart | null | undefined): boolean {
  return allSessions(cart).some((session: CartSession) => session.manualPrice != null);
}

/** True when a line holds a manual price or a clear still to confirm: the next request must go as lines. */
export function holdsManualPriceState(session: CartSession): boolean {
  return session.manualPrice != null || session.isManualPriceClearPending === true;
}

/**
 * The catalogue total of a line with a manual price (catalogue price × units × the tickets pricing the line), shown
 * struck through next to the manual total.
 */
export function getCatalogLineTotal(session: CartSession, cart: Cart | null | undefined): Money | null {
  if (session.manualPrice == null || session.catalogUnitPrice == null) {
    return null;
  }
  return new Money(
    new Decimal(session.catalogUnitPrice.amount).mul(getPricedUnits(session, cart)).toDecimalPlaces(manualPriceDecimalPlaces).toNumber(),
    session.catalogUnitPrice.currency,
  );
}

/**
 * The sum of (manual − catalogue) × units × the tickets pricing the line, over the lines with a manual price: the
 * "Line price changes" row of the totals.
 */
export function getManualPriceChangeTotal(cart: Cart | null | undefined): Money | null {
  const pricedSessions = allSessions(cart).filter(
    (session: CartSession) => session.manualPrice != null && session.catalogUnitPrice != null,
  );
  if (pricedSessions.length === 0) {
    return null;
  }
  const change = pricedSessions.reduce(
    (sum: Decimal, session: CartSession) =>
      sum.plus(
        new Decimal(session.manualPrice?.unitPrice.amount ?? 0)
          .minus(session.catalogUnitPrice?.amount ?? 0)
          .mul(getPricedUnits(session, cart)),
      ),
    new Decimal(0),
  );
  return new Money(change.toDecimalPlaces(manualPriceDecimalPlaces).toNumber(), pricedSessions[0].catalogUnitPrice?.currency ?? '');
}

/** Units of a line times the tickets each unit is charged for: more than the units only for a per-individual-ticket add-on. */
export function getPricedUnits(session: CartSession, cart: Cart | null | undefined): number {
  return cart == null ? session.units : session.units * countTicketsPricingTheLine(cart.sessionItemsByDatetime, session);
}

/** The catalogue total minus the manual total over the priced lines: what the manual prices took off the cart. */
export function getManualReductionTotal(cart: Cart | null | undefined): Money | null {
  const change = getManualPriceChangeTotal(cart);
  return change === null ? null : new Money(new Decimal(change.amount).negated().toNumber(), change.currency);
}

/** How many ticket types of the cart carry a manual price. */
export function countManualPricedTicketTypes(cart: Cart | null | undefined): number {
  return allSessions(cart).filter((session: CartSession) => session.manualPrice != null).length;
}

/** True when a cart request was refused for its manual prices (fever2 GAME-1722 spec 6.2, cart status codes 114 to 119). */
export function isManualPriceRefusalCode(code: number | string | null | undefined): boolean {
  return code != null && manualPriceRefusalCodes.includes(Number(code));
}

/** units × (price + fee per ticket), rounded to the cent: the totals the line editor shows. */
export function getLineTotal(unitPrice: Money, surchargePerTicket: Money | null, units: number): Money {
  const total = new Decimal(unitPrice.amount).plus(surchargePerTicket?.amount ?? 0).mul(units);
  return new Money(total.toDecimalPlaces(manualPriceDecimalPlaces).toNumber(), unitPrice.currency);
}

/** One entry per ticket type with a manual price; a pending clear sends no entry, its lines carry an explicit null. */
export function buildManualPriceRequestBodies(sessionItemsByDatetime: Map<string, CartSession[]>): CartManualPriceRequestBody[] {
  return Array.from(sessionItemsByDatetime.values())
    .flat()
    .filter((session: CartSession) => session.units > 0)
    .flatMap((session: CartSession) => {
      const manualPrice = session.manualPrice;
      if (manualPrice?.entry == null) {
        return [];
      }
      return [
        {
          amount: manualPrice.entry.amount,
          calculation: manualPrice.entry.calculation,
          concept: manualPrice.concept,
          operation: manualPrice.entry.operation,
          session_id: session.sessionId,
        },
      ];
    });
}

/** The manual price block of a cart or modification response; an entry this client cannot edit (a `final` price) maps to null. */
export function toCartSessionManualPrice(data: CartSessionManualPriceData): CartSessionManualPrice {
  return {
    concept: data.concept,
    entry: toManualPriceEntry(data),
    setBy: data.set_by ?? null,
    unitPrice: new Money(data.ticket_price.amount, data.ticket_price.currency),
  };
}

/** The backend refuses `manual_prices` without a complete acting employee, so a user missing one of its fields gets no price control. */
export function toActingEmployee(user: User | null): CartB2bEmployeeRequestBody | null {
  return user?.email != null && user.name != null && user.username != null
    ? { email: user.email, id: user.id, name: user.name, username: user.username }
    : null;
}

export function isLinePriceOverrideEnabled(optimizelyService: OptimizelyService | null | undefined): boolean {
  return (
    optimizelyService?.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.GAME_CENTERS_RESERVATIONS,
      team: 'game-centers',
    }) ?? false
  );
}

/**
 * Who may set a manual price per line in a Box Office order modification (GAME-2287), the same rule as `canSetModificationManualPrices` in Reservations.
 * IAM alone decides: no feature flag takes part (see the authorization gating rule).
 */
export function canSetLinePrices(userService: UserService): boolean {
  return userService.hasPermission(Permissions.CAN_OVERRIDE_CART) && userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF);
}

function toManualPriceEntry(data: CartSessionManualPriceData): CartSessionManualPriceEntry | null {
  const calculation = Object.values(CartAdjustmentPriceCalculation).find((value: string) => value === data.calculation);
  const operation = Object.values(CartAdjustmentPriceOperation).find((value: string) => value === data.operation);
  if (calculation === undefined || operation === undefined) {
    return null;
  }
  return { amount: Number(data.amount), calculation, operation };
}

function validateAmount(catalogUnitPrice: Money, draft: CartSessionManualPriceDraft): ManualPriceEntryError | null {
  const { amount, calculation, operation } = draft;
  if (amount == null || !Number.isFinite(amount) || amount < 0 || new Decimal(amount).decimalPlaces() > manualPriceDecimalPlaces) {
    return ManualPriceEntryError.AmountInvalid;
  }
  if (calculation === CartAdjustmentPriceCalculation.PERCENTAGE && amount > percentageLimit) {
    return ManualPriceEntryError.PercentageAboveLimit;
  }
  if (amount > manualPriceAmountLimit) {
    return ManualPriceEntryError.AmountAboveLimit;
  }
  const isReduction = operation === CartAdjustmentPriceOperation.SUBTRACT;
  if (calculation === CartAdjustmentPriceCalculation.FIXED && isReduction && amount > catalogUnitPrice.amount) {
    return ManualPriceEntryError.ReductionAboveCatalogue;
  }
  if (computeManualUnitPrice(catalogUnitPrice, { amount, calculation, operation }).amount > manualUnitPriceLimit) {
    return ManualPriceEntryError.PriceAboveLimit;
  }
  return null;
}

function allSessions(cart: Cart | null | undefined): CartSession[] {
  return Array.from(cart?.sessionItemsByDatetime.values() ?? []).flat();
}

function findLine(cart: Cart, datetimeKey: string, sessionId: number): CartSession | undefined {
  return cart.sessionItemsByDatetime.get(datetimeKey)?.find((session: CartSession) => session.sessionId === sessionId);
}

function updateLine(cart: Cart, datetimeKey: string, sessionId: number, update: (session: CartSession) => void): Cart {
  const newCart = cart.clone();
  const line = findLine(newCart, datetimeKey, sessionId);
  if (line !== undefined) {
    update(line);
  }
  newCart.timezone = cart.timezone;
  newCart.calculateTotal(newCart.appliedCoupon ?? undefined);
  return newCart;
}
