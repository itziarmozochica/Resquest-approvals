import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';

/**
 * B2BO-6203: in `upgrade_seating` mode the second screen must show seating tickets as free
 * (the customer is upgrading existing tickets, not paying again). The container that owns
 * the cart keeps the original prices for the cashier; only the second-screen projection is
 * transformed.
 */
export const UPGRADE_SEATING_MODE = 'upgrade_seating';

export function isUpgradeSeatingMode(queryParams: Record<string, string | undefined> | URLSearchParams | null | undefined): boolean {
  if (!queryParams) {
    return false;
  }
  const value = queryParams instanceof URLSearchParams ? queryParams.get('mode') : queryParams['mode'];
  return value === UPGRADE_SEATING_MODE;
}

export interface ApplyUpgradeSeatingPricingOptions {
  /** Session type ids treated as paid seating upgrades (Optimizely `session_type_ids_considered_as_seating_upgrades`). */
  upgradeSessionTypeIds?: ReadonlySet<number>;
}

export function applyUpgradeSeatingPricing(cart: Cart | null, options?: ApplyUpgradeSeatingPricingOptions): Cart | null {
  if (cart === null) {
    return null;
  }
  const transformedCart = cart.clone();
  const fallbackCurrency = transformedCart.total?.currency ?? '';
  const upgradeSessionTypeIds = options?.upgradeSessionTypeIds;
  transformedCart.sessionItemsByDatetime.forEach((sessions: CartSession[]) => {
    sessions.forEach((session: CartSession) => {
      if (isSeatingSession(session, upgradeSessionTypeIds)) {
        const zero = new Money(0, session.unitPrice?.currency ?? fallbackCurrency);
        session.unitPrice = zero;
        session.price = zero;
        session.surchargePerTicket = zero;
        session.totalSurchargePerTicket = zero;
      }
    });
  });
  transformedCart.appliedCoupon = null;
  transformedCart.total = sumNonSeatingTotal(transformedCart, fallbackCurrency);
  return transformedCart;
}

/**
 * `CartSession.hasSeating` is declared on the model but never populated from the backend
 * response. The rest of the codebase (e.g. `cart-detail.component.ts`) detects seating via
 * `session.seats?.length > 0`, so we use the same heuristic here as the primary signal and
 * keep the `hasSeating` flag as a fallback for synthetic carts (mainly tests).
 */
function isSeatingSession(session: CartSession, upgradeSessionTypeIds?: ReadonlySet<number>): boolean {
  // Paid add-ons (e.g. upgrade seat products) must stay billable on the second screen even when
  // the cart attaches seat labels/holds for fulfillment.
  if (session.sessionType?.isAddOn === true) {
    return false;
  }
  const sessionTypeId = session.sessionType?.id;
  if (sessionTypeId !== undefined && upgradeSessionTypeIds?.has(sessionTypeId) === true) {
    return false;
  }
  if (session.sessionType?.isShopProduct === true) {
    return false;
  }
  if ((session.seats?.length ?? 0) > 0) {
    return true;
  }
  return session.hasSeating === true;
}

function sumNonSeatingTotal(cart: Cart, fallbackCurrency: string): Money {
  let totalAmount = 0;
  let currency = fallbackCurrency;
  cart.sessionItemsByDatetime.forEach((sessions: CartSession[]) => {
    sessions.forEach((session: CartSession) => {
      totalAmount += (session.price?.amount ?? 0) + (session.totalSurchargePerTicket?.amount ?? 0);
      if (currency === '' && session.price?.currency) {
        currency = session.price.currency;
      }
    });
  });
  return new Money(totalAmount, currency);
}
