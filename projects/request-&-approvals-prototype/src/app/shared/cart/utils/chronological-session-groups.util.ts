import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { PRODUCTS_GROUP_KEY } from '@fz-original/app/shared/models/cart/cart.model';

export type CartSessionGroup = [datetime: string, sessions: CartSession[]];

export function chronologicalSessionGroups(sessionItemsByDatetime: ReadonlyMap<string, CartSession[]>): CartSessionGroup[] {
  return Array.from(sessionItemsByDatetime.entries()).sort(([a], [b]) => compareGroupKeys(a, b));
}

function compareGroupKeys(a: string, b: string): number {
  const instantA = groupInstant(a);
  const instantB = groupInstant(b);
  if (instantA !== instantB) {
    return instantA - instantB;
  }
  return a.localeCompare(b);
}

// Products and unparseable keys share the last position; the key comparison then keeps them deterministic.
function groupInstant(key: string): number {
  const instant = key === PRODUCTS_GROUP_KEY ? Number.NaN : Date.parse(key);
  return Number.isNaN(instant) ? Number.POSITIVE_INFINITY : instant;
}
