import { Order } from '../../../shared/models/order/order.model';

export function resolveGroupedOrdersFromMembers(order: Order): Order[] {
  const groupMembers = order.groupMembers ?? [];
  if (groupMembers.length === 0) {
    return [];
  }
  return [order, ...groupMembers].sort((first, second) => (first.id ?? 0) - (second.id ?? 0));
}
