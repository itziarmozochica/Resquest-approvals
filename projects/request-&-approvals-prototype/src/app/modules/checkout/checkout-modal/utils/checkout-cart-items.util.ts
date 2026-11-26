import { Money } from '@fz-original/app/shared/models/money.model';

import type { CheckoutCartItem } from '../models/checkout-cart-item.model';
import type { CheckoutContext } from '../models/checkout.model';
import { fromCents, toCents } from './checkout-split.util';

const PLACEHOLDER_TICKET_NAME_KEY = 'checkout.custom.placeholderTicket';
const PLACEHOLDER_ADD_ON_NAME_KEY = 'checkout.custom.placeholderAddOn';

/**
 * Presentation-only placeholder line items derived from the cart total. Two tickets plus one
 * add-on whose amounts always add up to the total (the last ticket absorbs the rounding
 * remainder). Replaced transparently once real cart items are passed via `CheckoutModalData`.
 */
export function buildPlaceholderCheckoutCartItems(context: CheckoutContext): CheckoutCartItem[] {
  const totalCents = toCents(context.cartTotal?.amount ?? 0);
  if (totalCents <= 0) {
    return [];
  }
  const currency = context.cartTotal?.currency ?? 'EUR';
  const addOnCents = Math.round(totalCents / 6);
  const ticketsCents = totalCents - addOnCents;
  const firstTicketCents = Math.floor(ticketsCents / 2);
  const secondTicketCents = ticketsCents - firstTicketCents;

  return [
    { id: 'ticket-1', name: PLACEHOLDER_TICKET_NAME_KEY, price: new Money(fromCents(firstTicketCents), currency), type: 'ticket' },
    { id: 'ticket-2', name: PLACEHOLDER_TICKET_NAME_KEY, price: new Money(fromCents(secondTicketCents), currency), type: 'ticket' },
    { id: 'add-on-1', name: PLACEHOLDER_ADD_ON_NAME_KEY, price: new Money(fromCents(addOnCents), currency), type: 'addOn' },
  ];
}

export function sumCartItemCents(items: CheckoutCartItem[], selectedIds: string[]): number {
  const selectedSet = new Set(selectedIds);
  return items.reduce((sum, item) => (selectedSet.has(item.id) ? sum + toCents(item.price.amount) : sum), 0);
}

/**
 * Scales the per-item prices so they add up exactly to the cart total. Per-item prices come from
 * each session, but coupons and taxes are cart-level adjustments that cannot be attributed to a
 * single item, so the raw sum can drift from what the cart actually owes. Prices are distributed
 * proportionally and the last item absorbs the rounding remainder, keeping "pay by item" and
 * "pay remaining" consistent with the amount the checkout charges.
 */
export function reconcileCartItemsToTotal(items: CheckoutCartItem[], total: Money | null): CheckoutCartItem[] {
  const targetCents = toCents(total?.amount ?? 0);
  const currentCents = items.reduce((sum, item) => sum + toCents(item.price.amount), 0);
  if (items.length === 0 || currentCents <= 0 || targetCents <= 0 || currentCents === targetCents) {
    return items;
  }
  const currency = total?.currency ?? items[0].price.currency;
  let allocatedCents = 0;
  return items.map((item, index) => {
    const isLastItem = index === items.length - 1;
    const itemCents = isLastItem ? targetCents - allocatedCents : Math.round((toCents(item.price.amount) / currentCents) * targetCents);
    allocatedCents += itemCents;
    return { ...item, price: new Money(fromCents(itemCents), currency) };
  });
}
