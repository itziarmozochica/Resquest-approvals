import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart, countTicketsPricingTheLine } from '@fz-original/app/shared/models/cart/cart.model';

import { PlanDiscount } from '../models/memberships.model';
import { calculateTotalDiscount } from './memberships.utils';

/** A tier may hold several coupon codes, but a cart carries exactly one, so only the best-saving code survives. */
export function selectEffectivePlanDiscounts(planDiscounts: PlanDiscount[], cart: Cart | null): PlanDiscount[] {
  const couponCodes: Set<string> = new Set(planDiscounts.map((planDiscount: PlanDiscount) => planDiscount.couponCode));
  if (couponCodes.size <= 1) {
    return planDiscounts;
  }

  const effectiveCouponCode: string | null = pickBestCouponCode(calculateSavingByCouponCode(planDiscounts, cart))?.[0] ?? null;

  return planDiscounts.filter((planDiscount: PlanDiscount) => planDiscount.couponCode === effectiveCouponCode);
}

export function selectChargeableMemberCouponCode(planDiscounts: PlanDiscount[], cart: Cart | null): string | null {
  const best: [string, number] | null = pickBestCouponCode(calculateSavingByCouponCode(planDiscounts, cart));

  return best !== null && best[1] > 0 ? best[0] : null;
}

function pickBestCouponCode(savingByCouponCode: Map<string, number>): [string, number] | null {
  let best: [string, number] | null = null;

  for (const [couponCode, saving] of savingByCouponCode) {
    if (best === null || saving > best[1]) {
      best = [couponCode, saving];
    }
  }

  return best;
}

function calculateSavingByCouponCode(planDiscounts: PlanDiscount[], cart: Cart | null): Map<string, number> {
  const savingByCouponCode = new Map<string, number>();
  const scoredPairs = new Set<string>();

  planDiscounts.forEach((planDiscount: PlanDiscount) => {
    const pair = `${planDiscount.couponCode}|${planDiscount.ticketTypeId}`;
    if (scoredPairs.has(pair)) {
      return;
    }
    scoredPairs.add(pair);
    savingByCouponCode.set(
      planDiscount.couponCode,
      (savingByCouponCode.get(planDiscount.couponCode) ?? 0) + calculateSaving(planDiscount, cart),
    );
  });

  return savingByCouponCode;
}

function calculateSaving(planDiscount: PlanDiscount, cart: Cart | null): number {
  if (cart === null) {
    return 0;
  }

  return [...(cart.sessionItemsByDatetime?.values() ?? [])]
    .flat()
    .reduce(
      (saving: number, cartSession: CartSession) =>
        saving + calculateSessionSaving(planDiscount, cartSession, countTicketsPricingTheLine(cart.sessionItemsByDatetime, cartSession)),
      0,
    );
}

/** `ticketsPricingTheLine` scales the saving as the cart scales the price of a per-individual-ticket add-on (B2BO-9343). */
function calculateSessionSaving(planDiscount: PlanDiscount, cartSession: CartSession, ticketsPricingTheLine: number): number {
  const unitPrice = cartSession.unitPrice;
  if (unitPrice == null || cartSession.sessionType?.id !== planDiscount.ticketTypeId) {
    return 0;
  }

  const unitPriceWithDiscount = calculateTotalDiscount(unitPrice.amount ?? 0, unitPrice.currency ?? '', {
    amount: planDiscount.discount,
    type: planDiscount.discountType,
  });

  return cartSession.units * ticketsPricingTheLine * ((unitPrice.amount ?? 0) - unitPriceWithDiscount.amount);
}
