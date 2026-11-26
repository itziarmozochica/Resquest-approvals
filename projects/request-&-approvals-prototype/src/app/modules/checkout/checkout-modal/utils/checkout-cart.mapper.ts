import type { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import type { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';

import type { CheckoutCartItem, CheckoutCartItemType } from '../models/checkout-cart-item.model';
import { fromCents, toCents } from './checkout-split.util';

function resolveSessionName(session: CartSession): string {
  return session.sessionNameWithoutFormat ?? session.sessionName ?? session.sessionType?.label ?? '—';
}

function resolveSessionType(session: CartSession): CheckoutCartItemType {
  return session.sessionType?.isAddOn === true ? 'addOn' : 'ticket';
}

function resolveUnitPrice(session: CartSession): Money {
  // Prefer the session total: `Cart.calculateTotal` writes plan discounts and surcharges into
  // `total`/`price` (not `unitPrice`), so it stays aligned with the cart total the checkout charges.
  if (session.total != null && session.units > 0) {
    return new Money(fromCents(Math.round(toCents(session.total.amount) / session.units)), session.total.currency);
  }
  if (session.unitPrice != null) {
    return new Money(session.unitPrice.amount, session.unitPrice.currency);
  }
  return new Money(0, session.price?.currency ?? session.total?.currency ?? 'EUR');
}

/**
 * Flattens the cart into one splittable line item per physical ticket. A session with `units > 1`
 * (including tickets configured to be purchased in multiple units at once) expands into that many
 * individual items so each one can be paid separately.
 */
export function mapCartToCheckoutCartItems(cart: Cart | null): CheckoutCartItem[] {
  if (cart == null) {
    return [];
  }

  const items: CheckoutCartItem[] = [];
  cart.sessionItemsByDatetime.forEach((sessions, datetimeKey) => {
    sessions.forEach(session => {
      if (session.units <= 0) {
        return;
      }
      const name = resolveSessionName(session);
      const type = resolveSessionType(session);
      const unitPrice = resolveUnitPrice(session);
      for (let index = 0; index < session.units; index += 1) {
        items.push({
          id: `${datetimeKey}:${session.sessionId}:${index}`,
          name,
          price: new Money(unitPrice.amount, unitPrice.currency),
          type,
        });
      }
    });
  });

  return items;
}
