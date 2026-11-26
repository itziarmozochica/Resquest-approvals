import { Order } from '../../../models/order/order.model';

/**
 * The reservation an order paid, if any. The API sends `null` for an order without one, which the
 * model's optional type does not show, so the value is read as the wire delivers it.
 */
export function reservationIdOf(order: Order | undefined): string | null {
  const reservationId: unknown = order?.reservationId;
  return typeof reservationId === 'string' && reservationId.length > 0 ? reservationId : null;
}
