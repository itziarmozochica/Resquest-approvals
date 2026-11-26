import { ValidationStatus } from '../../../../modules/validation/enums/validation-status.enum';
import { CartSession } from '../../../models/cart/cart-session.model';
import { AccessTicket } from '../../../models/order/access-ticket.model';
import { Order } from '../../../models/order/order.model';

export interface PendingTicketValidation {
  count: number;
  ticketId: number;
}

export interface PendingOrderValidation {
  codes: string[];
  tickets: PendingTicketValidation[];
}

export function isValidatableAccessTicket(ticket: AccessTicket): boolean {
  return !ticket.isTransactionFee && ticket.status !== ValidationStatus.CANCELLED && ticket.status !== ValidationStatus.TRANSFERRED;
}

export function isPendingValidationAccessTicket(ticket: AccessTicket): boolean {
  return isValidatableAccessTicket(ticket) && !ticket.isValidated && !ticket.redeemedAt;
}

export function getPendingOrderValidation(
  order: Order | undefined,
  sessions: CartSession[],
  selectedKeys?: ReadonlySet<string>,
): PendingOrderValidation {
  const pendingTickets = Array.from(order?.accessTickets?.values() ?? []).filter(
    ticket => isPendingValidationAccessTicket(ticket) && (selectedKeys === undefined || selectedKeys.has(ticket.id)),
  );

  return {
    codes: pendingTickets.map(ticket => ticket.code).filter((code): code is string => !!code),
    tickets: countUnitsBySession(pendingTickets, sessions),
  };
}

/**
 * What the per-session Validate button would send for the whole order: every selected coded ticket, validated
 * ones included (the API answers for those), and for a session without codes its selected units that are still
 * pending, since its counter never offers more than that.
 */
export function getSelectedOrderValidation(
  order: Order | undefined,
  sessions: CartSession[],
  selectedKeys: ReadonlySet<string>,
): PendingOrderValidation {
  const selectedTickets = Array.from(order?.accessTickets?.values() ?? []).filter(
    ticket => isValidatableAccessTicket(ticket) && selectedKeys.has(ticket.id),
  );

  return {
    codes: selectedTickets.map(ticket => ticket.code).filter((code): code is string => !!code),
    tickets: countUnitsBySession(selectedTickets.filter(isPendingValidationAccessTicket), sessions),
  };
}

function countUnitsBySession(tickets: AccessTicket[], sessions: CartSession[]): PendingTicketValidation[] {
  return sessions
    .filter(session => !session.hasCodes && session.status !== ValidationStatus.CANCELLED && !session.isPackConstituent)
    .map(session => ({
      count: tickets.filter(ticket => !ticket.code && ticket.ticketId === session.ticketId).length,
      ticketId: session.ticketId ?? 0,
    }))
    .filter(ticket => ticket.count > 0 && ticket.ticketId > 0);
}
