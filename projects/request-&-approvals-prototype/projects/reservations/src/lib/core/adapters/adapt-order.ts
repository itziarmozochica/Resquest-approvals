import type { NewReservationOrder, NewReservationOrderApi } from '../models/new-reservation.model';

export function adaptOrder(order: NewReservationOrderApi | null | undefined): NewReservationOrder | null {
  return order?.id === undefined ? null : { id: order.id };
}

/** A missing `order_ids` falls back to the single order: an empty list would read as "nothing was charged". */
export function adaptOrderIds(orderIds: number[] | null | undefined, order: NewReservationOrder | null): readonly number[] {
  if (orderIds !== null && orderIds !== undefined) {
    return orderIds;
  }
  return order === null ? [] : [order.id];
}
