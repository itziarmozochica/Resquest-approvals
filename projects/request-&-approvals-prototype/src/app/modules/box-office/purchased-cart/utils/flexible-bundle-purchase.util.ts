import { ValidationStatus } from '@fz-original/app/modules/validation/enums/validation-status.enum';
import { ImageCollage } from '@fz-original/app/shared/components/image-collage/models/image-collage.model';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';

import {
  FlexibleBundleBreakdown,
  FlexibleBundleBreakdownEntry,
  FlexibleBundlePurchase,
  FlexibleBundleScheduledSlot,
  FlexibleBundleScheduling,
  FlexibleBundleSecondaryOrder,
  FlexibleBundleTicket,
  FlexibleBundleTicketGroup,
  SCHEDULED_ENTITLEMENT_STATUS,
} from '../models/flexible-bundle-purchase.model';

export function buildFlexibleBundlePurchase(orders: Order[], cartCoupon: Coupon | null = null): FlexibleBundlePurchase | null {
  const primaryOrder = orders.find(isFlexibleBundlePrimaryOrder);
  return primaryOrder !== undefined ? toFlexibleBundlePurchase(primaryOrder, orders, cartCoupon) : null;
}

export function isFlexibleBundlePrimary(bundle: FlexibleBundlePurchase | null, order: Order): boolean {
  return bundle !== null && bundle.primaryOrder.id === order.id;
}

export function isFlexibleBundleSecondary(bundle: FlexibleBundlePurchase | null, order: Order): boolean {
  return bundle?.secondaryOrders.some(secondaryOrder => secondaryOrder.order.id === order.id) ?? false;
}

function isFlexibleBundlePrimaryOrder(order: Order): boolean {
  return order.isFlexibleBundlePrimary === true;
}

function toFlexibleBundlePurchase(primaryOrder: Order, orders: Order[], cartCoupon: Coupon | null): FlexibleBundlePurchase {
  const secondaryOrders = orders.filter(order => isSecondaryOf(primaryOrder, order));
  const bundleOrders = [primaryOrder, ...secondaryOrders];
  const total = sumOrderTotals(bundleOrders);

  return {
    breakdown: buildBreakdown(bundleOrders, cartCoupon),
    collageImages: bundleOrders.map(toCollageImage),
    primaryOrder,
    scheduling: buildScheduling(primaryOrder, secondaryOrders),
    secondaryOrders: secondaryOrders.map(toFlexibleBundleSecondaryOrder),
    ticketGroups: groupTicketsByGroupId(bundleOrders),
    total,
  };
}

function isSecondaryOf(primaryOrder: Order, order: Order): boolean {
  return order.id !== primaryOrder.id && order.orderGroupId != null && order.orderGroupId === primaryOrder.orderGroupId;
}

function toFlexibleBundleSecondaryOrder(order: Order): FlexibleBundleSecondaryOrder {
  return {
    coverImageUrl: order.coverImageUrl ?? null,
    entitlementStatus: order.entitlementsInfo?.status ?? null,
    order,
  };
}

function toCollageImage(order: Order): ImageCollage {
  return { alt: getAttractionName(order), url: order.coverImageUrl ?? '' };
}

/**
 * The primary order is the timed visit, so it is always scheduled. A secondary order is scheduled only when its
 * entitlement says so: one without entitlement info (an open pass such as Big Bus) carries a validity date, not a visit.
 */
function buildScheduling(primaryOrder: Order, secondaryOrders: Order[]): FlexibleBundleScheduling {
  const pendingOrders = secondaryOrders.filter(order => !isScheduled(order));
  const sessionSlots = [primaryOrder, ...secondaryOrders.filter(isScheduled)].flatMap(toSessionSlots);
  const startsAts = [...new Set(sessionSlots.map(({ startsAt }) => startsAt))].sort(
    (first, second) => Date.parse(first) - Date.parse(second),
  );

  return {
    pendingAttractionNames: [...new Set(pendingOrders.map(getAttractionName))],
    scheduledSlots: startsAts.map(startsAt => mergeSessionSlots(startsAt, sessionSlots)),
  };
}

function mergeSessionSlots(startsAt: string, sessionSlots: FlexibleBundleScheduledSlot[]): FlexibleBundleScheduledSlot {
  const slotsAtStart = sessionSlots.filter(slot => slot.startsAt === startsAt);

  return {
    attractionNames: [...new Set(slotsAtStart.flatMap(({ attractionNames }) => attractionNames))],
    startsAt,
    timezone: slotsAtStart[0]?.timezone ?? null,
  };
}

function toSessionSlots(order: Order): FlexibleBundleScheduledSlot[] {
  const attractionName = getAttractionName(order);

  return Array.from(order.cart?.sessionItemsByDatetime ?? new Map<string, CartSession[]>())
    .filter(([, sessions]) => sessions.some(session => session.sessionType?.isShopProduct !== true))
    .map(([startsAt, sessions]) => ({
      attractionNames: [attractionName],
      startsAt,
      timezone: sessions[0]?.sessionTimezone ?? order.cart?.timezone ?? null,
    }));
}

function isScheduled(order: Order): boolean {
  return order.entitlementsInfo?.status === SCHEDULED_ENTITLEMENT_STATUS;
}

function getAttractionName(order: Order): string {
  return order.effectivePlanName ?? '';
}

function groupTicketsByGroupId(orders: Order[]): FlexibleBundleTicketGroup[] {
  const tickets = orders.flatMap(toFlexibleBundleTickets);
  const groupIds = [...new Set(tickets.map(({ ticket }) => ticket.groupId ?? null))];

  return groupIds.map(groupId => ({
    groupId,
    tickets: tickets.filter(({ ticket }) => (ticket.groupId ?? null) === groupId),
  }));
}

function toFlexibleBundleTickets(order: Order): FlexibleBundleTicket[] {
  const orderId = order.id;
  if (orderId === undefined) {
    return [];
  }

  return Array.from(order.accessTickets?.values() ?? [])
    .filter(ticket => ticket.status !== ValidationStatus.CANCELLED)
    .map(ticket => ({ orderId, ticket }));
}

function sumOrderTotals(orders: Order[]): Money | null {
  return sumPresentMoneys(orders.map(order => order.cart?.total));
}

function sumPresentMoneys(moneys: Array<Money | null | undefined>): Money | null {
  const presentMoneys = moneys.filter((money): money is Money => money != null);
  if (presentMoneys.length === 0) {
    return null;
  }

  const amount = presentMoneys.reduce((sum, money) => sum + money.amount, 0);
  return new Money(fixedDecimals(amount, 2), presentMoneys[0].currency);
}

function buildBreakdown(orders: Order[], cartCoupon: Coupon | null): FlexibleBundleBreakdown {
  const entries = orders.flatMap(toBreakdownEntries);
  const lines = [...buildGroupedLines(entries), ...buildUngroupedLines(entries)];

  return { bundleDiscount: getBundleDiscount(orders), coupon: cartCoupon, lines };
}

function buildGroupedLines(entries: FlexibleBundleBreakdownEntry[]): CartSession[] {
  const groupIds = [...new Set(entries.map(({ groupId }) => groupId).filter((groupId): groupId is number => groupId !== null))];

  return groupIds.map(groupId => mergeTicketTypeEntries(entries.filter(entry => entry.groupId === groupId)));
}

function buildUngroupedLines(entries: FlexibleBundleBreakdownEntry[]): CartSession[] {
  return entries.filter(({ groupId }) => groupId === null).map(({ cartSession }) => withShopProductName(cartSession));
}

function toBreakdownEntries(order: Order): FlexibleBundleBreakdownEntry[] {
  const tickets = Array.from(order.accessTickets?.values() ?? []);

  return Array.from(order.cart?.sessionItemsByDatetime.values() ?? [])
    .flat()
    .map(cartSession => ({
      cartSession,
      groupId: tickets.find(ticket => ticket.ticketId === cartSession.ticketId)?.groupId ?? null,
      order,
    }));
}

function withShopProductName(cartSession: CartSession): CartSession {
  if (cartSession.sessionType?.isShopProduct !== true) {
    return cartSession;
  }

  const line = cartSession.clone();
  line.sessionNameWithoutFormat = cartSession.sessionName;
  return line;
}

function mergeTicketTypeEntries(entries: FlexibleBundleBreakdownEntry[]): CartSession {
  const [firstEntry] = entries;
  const merged = firstEntry.cartSession.clone();
  const units = entries.filter(({ order }) => order === firstEntry.order).reduce((sum, { cartSession }) => sum + cartSession.units, 0);
  const totalSurchargePerTicket = sumPresentMoneys(entries.map(({ cartSession }) => cartSession.totalSurchargePerTicket));

  merged.units = units;
  merged.price = sumPresentMoneys(entries.map(({ cartSession }) => cartSession.price));
  merged.totalSurchargePerTicket = totalSurchargePerTicket;
  merged.surchargePerTicket =
    totalSurchargePerTicket !== null
      ? new Money(fixedDecimals(totalSurchargePerTicket.amount / units, 2), totalSurchargePerTicket.currency)
      : null;

  return merged;
}

function getBundleDiscount(orders: Order[]): Money | null {
  const bundleDiscount = sumPresentMoneys(orders.map(order => order.bundleDiscount));

  return bundleDiscount !== null && bundleDiscount.amount > 0 ? new Money(-bundleDiscount.amount, bundleDiscount.currency) : null;
}
