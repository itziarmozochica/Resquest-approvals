import { CartAdjustmentPrice } from '../cart/models/cart-adjustment-price.model';
import { CartSession } from '../models/cart/cart-session.model';
import { Cart } from '../models/cart/cart.model';
import { SessionTypeDiscounts } from '../models/cart/session-type-discounts.model';

export function sessionTypeDiscountKey(mainPlanId: number, sessionTypeId: number): string {
  return `${mainPlanId}|${sessionTypeId}`;
}

/** The line price entry a session type of a main plan keeps, or `null` when it has none: another main plan never keeps it. */
export function sessionTypeDiscountFor(
  discounts: SessionTypeDiscounts | null | undefined,
  mainPlanId: number | null | undefined,
  sessionTypeId: number | null | undefined,
): CartAdjustmentPrice | null {
  if (discounts == null || mainPlanId == null || sessionTypeId == null) {
    return null;
  }
  return discounts.get(sessionTypeDiscountKey(mainPlanId, sessionTypeId)) ?? null;
}

/** The line price entry of each session type of `orderCart`, per main plan, the first line winning. */
export function sessionTypeDiscountsFrom(orderCart: Cart): SessionTypeDiscounts {
  return Array.from(orderCart.sessionItemsByDatetime?.values() ?? [])
    .flat()
    .reduce((discounts: SessionTypeDiscounts, session: CartSession) => {
      const { mainPlanId, orderManualPrice, sessionType } = session;
      if (orderManualPrice == null || mainPlanId == null || sessionType?.id == null) {
        return discounts;
      }
      const key = sessionTypeDiscountKey(mainPlanId, sessionType.id);
      return discounts.has(key) ? discounts : new Map([...discounts, [key, orderManualPrice]]);
    }, new Map<string, CartAdjustmentPrice>());
}
