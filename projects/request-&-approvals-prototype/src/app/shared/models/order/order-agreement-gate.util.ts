import { AccessTicket } from './access-ticket.model';
import { Order } from './order.model';
import { agreementSignedReleaseCondition, TicketReleaseConditionAction } from './release-condition.model';

export function hasUnsignedAgreement(ticket: AccessTicket): boolean {
  return ticket.releaseCondition?.type === agreementSignedReleaseCondition;
}

export function isOrderAgreementBlocked(order: Order): boolean {
  const tickets = order.ticketsAndProducts ?? order.accessTickets;
  if (!tickets) {
    return false;
  }
  return Array.from(tickets.values()).some(hasUnsignedAgreement);
}

/**
 * Whether the order was created with release conditions, so it may carry agreements, signed or not. A
 * pending `release_condition` counts too: it implies the flag, and covers a fever2 that does not send it yet.
 */
export function hasOrderReleaseConditions(order: Order): boolean {
  return Array.from((order.ticketsAndProducts ?? order.accessTickets)?.values() ?? []).some(
    (ticket: AccessTicket) => ticket.hasReleaseConditions === true || hasUnsignedAgreement(ticket),
  );
}

export function areOrdersAgreementBlocked(orders: Array<Order>): boolean {
  return orders.some(isOrderAgreementBlocked);
}

/**
 * The call-to-action state carried by the first blocked ticket that states one, across every
 * blocked ticket of every order. The label is the client's own, so this only carries `isEnabled`:
 * the backend's kill switch for the affordance. Returns `null` when nothing is blocked, or when no
 * blocked ticket named an action - which the UI reads as "offer it", so a ticket that disabled the
 * affordance must not be skipped in favour of one that said nothing.
 */
export function getAgreementGateAction(orders: Array<Order>): TicketReleaseConditionAction | null {
  for (const order of orders) {
    const tickets = order.ticketsAndProducts ?? order.accessTickets;
    if (!tickets) {
      continue;
    }
    const action = Array.from(tickets.values())
      .filter(hasUnsignedAgreement)
      .find(ticket => ticket.releaseCondition?.action)?.releaseCondition?.action;
    if (action) {
      return action;
    }
  }
  return null;
}
