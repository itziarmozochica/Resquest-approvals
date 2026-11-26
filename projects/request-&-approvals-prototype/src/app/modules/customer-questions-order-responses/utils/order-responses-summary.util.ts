import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';

import { OrderResponsesSummary } from '../models/order-responses-summary.model';

export function toOrderResponsesSummary(order: Order): OrderResponsesSummary {
  const owner = cartSessions(order).find(session => session.ownerFullName || session.ownerEmail || session.ownerPhone);

  return {
    buyerEmail: owner?.ownerEmail ?? order.user?.email ?? '',
    buyerName: owner?.ownerFullName ?? order.user?.name ?? '',
    isGuest: owner?.isGuest ?? false,
    orderDate: order.createdAt ?? null,
    phone: owner?.ownerPhone ?? order.user?.phoneNumber ?? '',
    reference: order.externalId ?? '',
    ticketCount: ticketCount(order),
  };
}

export function getTicketSessionTypeIds(order: Order): (number | null)[] {
  const ids = ticketSessions(order).flatMap(session => Array.from({ length: session.units }, () => session.sessionType?.id ?? null));

  return new Set(ids).size > 1 ? [] : ids;
}

export function getOrderSessionTypeIds(order: Order): number[] {
  const ids = new Set<number>();

  for (const session of ticketSessions(order)) {
    if (session.sessionType?.id !== undefined) {
      ids.add(session.sessionType.id);
    }
  }

  return [...ids];
}

function cartSessions(order: Order): CartSession[] {
  return [...(order.cart?.sessionItemsByDatetime?.values() ?? [])].flat();
}

function ticketSessions(order: Order): CartSession[] {
  return cartSessions(order).filter(session => !session.sessionType?.isShopProduct);
}

function ticketCount(order: Order): number {
  const sessions = cartSessions(order);
  if (sessions.length === 0) {
    return order.cart?.numberOfTickets ?? 0;
  }

  return ticketSessions(order).reduce((total, session) => total + session.units, 0);
}
