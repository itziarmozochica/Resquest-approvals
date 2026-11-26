import { Cart } from '../models/cart/cart.model';
import { IMoney } from '../models/money.model';

/**
 * Total tax the backend attached to a cart, or `undefined` when there is nothing to disclose.
 *
 * Tolerates a tax item missing its amount the same way `Cart.calculateTotal()` does, and takes the
 * currency from the first tax item that carries one.
 */
export function getCartTotalTax(cart: Cart): IMoney | undefined {
  if (cart.taxItems === undefined || cart.taxItems.length === 0) {
    return undefined;
  }
  const amount = cart.taxItems.reduce((total, taxItem) => total + (taxItem.taxAmount?.amount ?? 0), 0);
  if (amount === 0) {
    return undefined;
  }
  return {
    amount,
    currency: cart.taxItems.find(taxItem => taxItem.taxAmount?.currency)?.taxAmount?.currency ?? '',
  };
}
