import { TemplateCouponTypeET } from './template-coupon-type.model';
import { TemplateCouponKindET, TemplateCouponStatus } from './template-coupon.model';
import { TimeSlotFilter } from './time-slot-filter.model';

export interface TemplateCouponDetail {
  appliesToSurcharge: boolean;
  availablePurchases: number | null;
  availableRedeems: number | null;
  bundleBuy: number | null;
  bundlePay: number | null;
  bundleUsageLimit: number | null;
  code: string | null;
  codePrefix: string | null;
  countToCreate: number | null;
  couponType: TemplateCouponTypeET;
  currencyIdentifier: string | null;
  currentConsumptions: number | null;
  currentUsages: number | null;
  description: string | null;
  discountQuantity: number | null;
  discountType: TemplateCouponKindET;
  expirationDate: Date | null;
  id?: number;
  isActive?: boolean;
  maxTicketsPerOrder: number | null;
  minTicketsPerOrder: number | null;
  maxUsesPerUser: number | null;
  numberOfTicketsPurchasable: number | null;
  restrictedChannelIds: Array<string>;
  restrictedCityIds: Array<number>;
  restrictedPlanIds: Array<number>;
  restrictedSessionTypeIds: Array<number>;
  startDate: Date | null;
  status?: TemplateCouponStatus;
  timeSlotFilters: Array<TimeSlotFilter>;
  title: string | null;
  totalAvailableConsumptions: number | null;
  totalAvailableUsages: number | null;
}
