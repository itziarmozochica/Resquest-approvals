import { PlanDiscountType } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';

import { Coupon } from './coupon.model';

export interface Coupons {
  vouchers: Array<Coupon>;
  discounts: Array<CouponDiscount>;
}

export interface CouponDiscount {
  code: string;
  currency: string;
  discounts: Array<CouponDiscountItem>;
}

export interface CouponDiscountItem {
  ticketTypeId: number;
  discount: number;
  discountType: PlanDiscountType;
}
