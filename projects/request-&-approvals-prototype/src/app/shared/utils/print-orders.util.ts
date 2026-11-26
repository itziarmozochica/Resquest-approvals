import { Order } from '../models/order/order.model';
import { PrinterOrder, PrinterTicket, PrintOrderInput, ResolvedPrintOrderInput } from '../models/order/printer-order.model';
import { TicketTimeGranularity } from '../models/order/ticket-time-granularity.enum';
import { SessionSelectorType } from '../services/session-availability/session-selector-type.enum';

const leastRestrictiveTimeGranularities: readonly TicketTimeGranularity[] = [
  TicketTimeGranularity.DATE_AND_TIME,
  TicketTimeGranularity.DATE,
  TicketTimeGranularity.ANYTIME,
];

export function isNotPrintableOrders(orders: Order[]): boolean {
  return orders.length === 0 || orders.every((order: Order) => countPrintableAccessTickets(order) === 0);
}

export function withDefaultIsUnifiedTicket(orders: PrintOrderInput[]): ResolvedPrintOrderInput[] {
  return orders.map((input: PrintOrderInput) => ({
    isHidePriceEnabled: input.isHidePriceEnabled ?? false,
    isUnifiedTicket: input.isUnifiedTicket ?? false,
    order: input.order.withoutTransactionFeeAccessTickets(),
  }));
}

export function getEffectiveBookingTimeGranularity(order: PrinterOrder): TicketTimeGranularity {
  const defaultTimeGranularity =
    order.plan.sessionSelectorType === SessionSelectorType.BY_TIMELESS_SESSION
      ? TicketTimeGranularity.ANYTIME
      : TicketTimeGranularity.DATE_AND_TIME;
  const ticketTimeGranularities = order.tickets.map((ticket: PrinterTicket) => ticket.timeGranularity ?? defaultTimeGranularity);

  return (
    leastRestrictiveTimeGranularities.find((candidate: TicketTimeGranularity) => ticketTimeGranularities.includes(candidate)) ??
    defaultTimeGranularity
  );
}

function countPrintableAccessTickets(order: Order): number {
  return order.withoutTransactionFeeAccessTickets().accessTickets?.size ?? 0;
}
