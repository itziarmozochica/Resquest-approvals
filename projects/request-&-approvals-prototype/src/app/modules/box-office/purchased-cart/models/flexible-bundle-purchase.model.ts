import { ImageCollage } from '@fz-original/app/shared/components/image-collage/models/image-collage.model';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { EntitlementStatus } from '@fz-original/app/shared/models/order/entitlements-info.model';
import { Order, OrderId } from '@fz-original/app/shared/models/order/order.model';

export const SCHEDULED_ENTITLEMENT_STATUS: EntitlementStatus = 'scheduled';

export interface FlexibleBundleSecondaryOrder {
  coverImageUrl: string | null;
  entitlementStatus: EntitlementStatus | null;
  order: Order;
}

export interface FlexibleBundleTicket {
  orderId: OrderId;
  ticket: AccessTicket;
}

export interface FlexibleBundleTicketGroup {
  groupId: number | null;
  tickets: FlexibleBundleTicket[];
}

export interface FlexibleBundleScheduledSlot {
  attractionNames: string[];
  startsAt: string;
  timezone: string | null;
}

export interface FlexibleBundleScheduling {
  pendingAttractionNames: string[];
  scheduledSlots: FlexibleBundleScheduledSlot[];
}

export interface FlexibleBundleBreakdownEntry {
  cartSession: CartSession;
  groupId: number | null;
  order: Order;
}

export interface FlexibleBundleBreakdown {
  bundleDiscount: Money | null;
  coupon: Coupon | null;
  lines: CartSession[];
}

export interface FlexibleBundlePurchase {
  breakdown: FlexibleBundleBreakdown;
  collageImages: ImageCollage[];
  primaryOrder: Order;
  scheduling: FlexibleBundleScheduling;
  secondaryOrders: FlexibleBundleSecondaryOrder[];
  ticketGroups: FlexibleBundleTicketGroup[];
  total: Money | null;
}
