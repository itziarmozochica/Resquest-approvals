import type { PartialRefundPreviewSection } from '../models/partial-refund-preview.model';
import type { PartialRefundRejectedOrder, PartialRefundRejection } from '../models/partial-refund-rejection.model';

/**
 * Every rejection code leaves its order out, ceiling overages included: the engine reports them
 * alongside the arithmetic, not instead of it, so a rejected order's tickets still appear in the
 * sections while never being refunded. Capping is a different thing entirely and is carried by the
 * row's own `isCapped` flag, which is why it is read from the rows below rather than from a code.
 */
export function excludedRejections(rejections: readonly PartialRefundRejection[]): readonly PartialRefundRejection[] {
  return rejections;
}

/**
 * Counted over orders, not over codes. One order can fail several checks at once and appears under
 * each of them, so adding the per-code totals reported the same tickets more than once: six tickets
 * failing two checks read as twelve. The summaries are only added up while the engine does not name
 * the orders.
 */
export function excludedTicketCount(
  rejections: readonly PartialRefundRejection[],
  rejectedOrders: readonly PartialRefundRejectedOrder[] = [],
): number {
  if (rejectedOrders.length > 0) {
    return rejectedOrders.reduce((total, order) => total + order.ticketsCount, 0);
  }

  return rejections.reduce((total, rejection) => total + rejection.ticketsCount, 0);
}

export function excludedOrderCount(
  rejections: readonly PartialRefundRejection[],
  rejectedOrders: readonly PartialRefundRejectedOrder[] = [],
): number {
  if (rejectedOrders.length > 0) {
    return rejectedOrders.length;
  }

  return rejections.reduce((total, rejection) => total + rejection.ordersCount, 0);
}

/** Tickets whose refund the engine limited to what they had left, read from the rows it capped. */
export function cappedTicketCount(sections: readonly PartialRefundPreviewSection[]): number {
  return sections
    .flatMap(section => section.rows)
    .filter(row => row.isCapped)
    .reduce((total, row) => total + row.ticketsCount, 0);
}
