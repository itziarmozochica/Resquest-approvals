import { isSecondaryGroupMember } from '../../../shared/models/order/order-group-kind.util';
import { Order } from '../../../shared/models/order/order.model';

export function resolveGroupedOrdersForDisplay(order: Order, searchResultOrders: Order[], fetchedGroupedOrders: Order[]): Order[] {
  const membersFromSearch = collectGroupMembersFromSearchResults(order, searchResultOrders);
  if (membersFromSearch.length > 1) {
    return membersFromSearch;
  }
  if (fetchedGroupedOrdersBelongToOrder(order, fetchedGroupedOrders)) {
    return fetchedGroupedOrders;
  }
  return [];
}

export function resolvePrimaryOrdersForDisplay(orders: Order[]): Order[] {
  const presentOrderIds = new Set<number>();
  for (const order of orders) {
    if (order.id !== undefined) {
      presentOrderIds.add(order.id);
    }
  }
  return orders.filter(order => !isSecondaryWithMainPresent(order, presentOrderIds));
}

function isSecondaryWithMainPresent(order: Order, presentOrderIds: Set<number>): boolean {
  if (!isSecondaryGroupMember(order)) {
    return false;
  }
  const mainOrderId = order.mainOrderId;
  return mainOrderId !== undefined && presentOrderIds.has(mainOrderId);
}

function collectGroupMembersFromSearchResults(order: Order, searchResultOrders: Order[]): Order[] {
  const orderId = order.id;
  if (orderId === undefined) {
    return [];
  }
  const groupedOrderIds = new Set(order.groupedOrders ?? []);
  const members = searchResultOrders.filter(candidate => isGroupMemberOf(orderId, groupedOrderIds, candidate));
  if (members.length < 2) {
    return [];
  }
  const mainOrder = members.find(member => member.id === orderId);
  if (mainOrder === undefined) {
    return members;
  }
  return [mainOrder, ...members.filter(member => member.id !== orderId)];
}

function fetchedGroupedOrdersBelongToOrder(order: Order, fetchedGroupedOrders: Order[]): boolean {
  const orderId = order.id;
  if (orderId === undefined || fetchedGroupedOrders.length === 0) {
    return false;
  }
  return fetchedGroupedOrders.some(groupedOrder => groupedOrder.id === orderId);
}

function isGroupMemberOf(mainOrderId: number, groupedOrderIds: Set<number>, candidate: Order): boolean {
  const candidateId = candidate.id;
  if (candidateId === undefined) {
    return false;
  }
  if (candidateId === mainOrderId) {
    return true;
  }
  if (candidate.mainOrderId === mainOrderId) {
    return true;
  }
  return groupedOrderIds.has(candidateId);
}
