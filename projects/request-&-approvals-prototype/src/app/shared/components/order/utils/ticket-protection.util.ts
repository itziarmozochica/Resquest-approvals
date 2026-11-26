import { CartSession } from '../../../models/cart/cart-session.model';
import { Order } from '../../../models/order/order.model';
import { isCancellationInsuranceSessionType } from '../../../models/session-type/session-type.util';

export function getTicketProtectionAccessTicketIds(cartSessions: CartSession[]): Set<string> {
  return new Set(
    cartSessions
      .filter(session => isCancellationInsuranceSessionType(session.sessionType))
      .flatMap(session => session.accessTicketIds ?? []),
  );
}

export function hasCodedTicketProtectionAccessTickets(order: Order): boolean {
  return [...getTicketProtectionAccessTicketIds(sessionsOf(order))].some(id => !!order.accessTickets?.get(id)?.code);
}

export function filterTicketProtectionAccessTickets(order: Order): Order {
  const ticketProtectionAccessTicketIds = getTicketProtectionAccessTicketIds(sessionsOf(order));
  if (ticketProtectionAccessTicketIds.size === 0) {
    return order;
  }

  return order.filterAccessTicketsByKeys(
    new Set([...(order.accessTickets?.keys() ?? [])].filter(id => !ticketProtectionAccessTicketIds.has(id))),
  );
}

function sessionsOf(order: Order): CartSession[] {
  return Array.from(order.cart?.sessionItemsByDatetime?.values() ?? []).flat();
}
