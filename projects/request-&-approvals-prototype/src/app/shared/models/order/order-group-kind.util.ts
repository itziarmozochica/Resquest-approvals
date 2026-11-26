import { Order } from './order.model';

export type OrderGroupKind = 'single' | 'entitlement-main' | 'entitlement-ghost' | 'cart-main' | 'cart-member';

export function getOrderGroupKind(order: Order): OrderGroupKind {
  if (order.entitlementsInfo != null) {
    return 'entitlement-main';
  }
  if (order.isMainGroupOrder === true) {
    return 'entitlement-main';
  }
  if (order.isMainGroupOrder === false) {
    return 'entitlement-ghost';
  }

  const groupedOrdersCount = order.groupedOrders?.length ?? 0;
  const isMainOrder = order.mainOrderId == null || order.mainOrderId === order.id;
  if (groupedOrdersCount > 1 && isMainOrder) {
    return 'cart-main';
  }
  if (order.mainOrderId != null && order.mainOrderId !== order.id) {
    return 'cart-member';
  }

  return 'single';
}

export function isEntitlementGroupOrder(order: Order): boolean {
  const groupKind = getOrderGroupKind(order);
  return groupKind === 'entitlement-main' || groupKind === 'entitlement-ghost';
}

export function isNonEntitlementGroupedOrder(order: Order): boolean {
  const groupKind = getOrderGroupKind(order);
  return groupKind === 'cart-main' || groupKind === 'cart-member';
}

export function isSecondaryGroupMember(order: Order | null): boolean {
  const orderId = order?.id;
  const mainOrderId = order?.mainOrderId;
  return orderId !== undefined && mainOrderId !== undefined && orderId !== mainOrderId;
}
