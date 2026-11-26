import { EntitlementStatus } from '@fz-original/app/shared/models/order/entitlements-info.model';
import { isNonEntitlementGroupedOrder } from '@fz-original/app/shared/models/order/order-group-kind.util';
import { Order } from '@fz-original/app/shared/models/order/order.model';

export const PENDING_TO_SCHEDULE_STATUS: EntitlementStatus = 'pending_to_schedule';

export function hasGroupedOrderIds(order: Order | undefined): order is Order {
  return (order?.groupedOrders?.length ?? 0) > 0;
}

export function toPrintableOrder(order: Order): Order | null {
  if (order.entitlementsInfo?.status === PENDING_TO_SCHEDULE_STATUS) {
    return null;
  }

  const printable = order.clone();
  printable.filterAccessTicketsCancelled();
  printable.filterAccessTicketsWithoutCode();

  return printable.accessTickets?.size ? printable : null;
}

export function toPrintableOrderRelaxed(order: Order): Order | null {
  if (order.entitlementsInfo?.status === PENDING_TO_SCHEDULE_STATUS) {
    return null;
  }

  const printable = order.clone();
  printable.filterAccessTicketsCancelled();

  return printable.accessTickets?.size ? printable : null;
}

export function toPrintableOrderByGroupKind(order: Order): Order | null {
  return isNonEntitlementGroupedOrder(order) ? toPrintableOrderRelaxed(order) : toPrintableOrder(order);
}

export function toPrintableOrders(orders: Order[]): Order[] {
  return orders.map(toPrintableOrderByGroupKind).filter((order): order is Order => order !== null);
}

export function toOrderForManualTicketOperations(order: Order): Order[] {
  const printable = order.clone();
  printable.filterAccessTicketsCancelled();

  return printable.accessTickets?.size ? [printable] : [];
}

export function sortPrintableOrdersWithMainFirst(mainOrder: Order, printableOrders: Order[]): Order[] {
  const mainOrderId = mainOrder.id;
  if (mainOrderId === undefined) {
    return printableOrders;
  }

  return [...printableOrders.filter(order => order.id === mainOrderId), ...printableOrders.filter(order => order.id !== mainOrderId)];
}

export function getOrdersForTicketOperations(ordersForPrint: Order[] | null, clickedOrder: Order): Order[] {
  if (ordersForPrint !== null && ordersForPrint.length > 0) {
    return hasGroupedOrderIds(clickedOrder) ? sortPrintableOrdersWithMainFirst(clickedOrder, ordersForPrint) : ordersForPrint;
  }

  return toOrderForManualTicketOperations(clickedOrder);
}

export function selectOrdersInGroupFromCart(allCartOrders: Order[], mainOrder: Order): Order[] {
  const groupedOrderIds = mainOrder.groupedOrders ?? [];
  if (groupedOrderIds.length === 0) {
    return [];
  }

  const ordersById = new Map<number, Order>(
    allCartOrders.filter((order): order is Order => order.id !== undefined).map(order => [order.id!, order]),
  );

  return groupedOrderIds.flatMap(orderId => {
    const order = orderId === mainOrder.id ? mainOrder : ordersById.get(orderId);
    return order !== undefined ? [order] : [];
  });
}

export function getPrintableOrdersFromCart(allCartOrders: Order[], uiOrders: Order[]): Order[] {
  const mainOrder = uiOrders.find(hasGroupedOrderIds);

  if (mainOrder === undefined) {
    return uiOrders.map(toPrintableOrderByGroupKind).filter((order): order is Order => order !== null);
  }

  return selectOrdersInGroupFromCart(allCartOrders, mainOrder)
    .map(toPrintableOrderByGroupKind)
    .filter((order): order is Order => order !== null);
}
