import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

export function getReservedUnitsBySessionId(cart: Cart | null | undefined): ReadonlyMap<number, number> {
  const reservedUnitsBySessionId = new Map<number, number>();

  for (const cartSessions of cart?.sessionItemsByDatetime?.values() ?? []) {
    for (const cartSession of cartSessions) {
      if (cartSession.units <= 0) {
        continue;
      }
      reservedUnitsBySessionId.set(cartSession.sessionId, (reservedUnitsBySessionId.get(cartSession.sessionId) ?? 0) + cartSession.units);
    }
  }

  return reservedUnitsBySessionId;
}
