import { TemplateCouponKind } from './template-coupon.model';
import { TimeSlotFilter } from './time-slot-filter.model';

export interface TemplateCouponPatch {
  appliesToSurcharge: boolean;
  availableRedeems: number | null;
  availablePurchases: number | null;
  bundleBuy: number | null;
  bundlePay: number | null;
  currencyIdentifier?: string | null;
  description: string;
  discountQuantity: number;
  discountType: TemplateCouponKind;
  expirationDate: Date;
  isActive: boolean;
  maxTicketsPerOrder: number | null;
  minTicketsPerOrder: number | null;
  maxUsesPerUser: number | null;
  numberOfTicketsPurchasable: number | null;
  restrictedChannelIds: Array<string>;
  restrictedCityIds: Array<number>;
  restrictedPlanIds: Array<number>;
  restrictedSessionTypeIds: Array<number>;
  startDate: Date | null;
  timeSlotFilters: Array<TimeSlotFilter>;
  title: string;
}
