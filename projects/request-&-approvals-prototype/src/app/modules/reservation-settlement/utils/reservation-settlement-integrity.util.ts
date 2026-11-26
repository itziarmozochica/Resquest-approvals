import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

import { ReservationSettlementSession } from '../models/reservation-settlement-session.model';

export function matchesReservationSettlementSession(
  cart: Cart | null | undefined,
  session: ReservationSettlementSession | null | undefined,
): boolean {
  if (cart == null || session == null) {
    return false;
  }

  if (cart.id == null || cart.id !== session.cartId) {
    return false;
  }

  return haveSameLines(buildLineKeys(cart), buildLineKeys(session.cart));
}

function buildLineKeys(cart: Cart): string[] {
  const keys: string[] = [];

  for (const cartSessions of cart.sessionItemsByDatetime?.values() ?? []) {
    for (const cartSession of cartSessions) {
      if (cartSession.units <= 0) {
        continue;
      }
      keys.push(buildLineKey(cartSession));
    }
  }

  return keys.sort();
}

function buildLineKey(cartSession: CartSession): string {
  return `${cartSession.sessionId}|${cartSession.sessionType?.id ?? ''}|${cartSession.units}`;
}

function haveSameLines(cartLineKeys: string[], reservationLineKeys: string[]): boolean {
  if (cartLineKeys.length !== reservationLineKeys.length) {
    return false;
  }

  return cartLineKeys.every((lineKey: string, index: number) => lineKey === reservationLineKeys[index]);
}
