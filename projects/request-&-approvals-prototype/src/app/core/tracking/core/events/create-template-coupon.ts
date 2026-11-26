import { TemplateCouponKind } from '../../../../modules/coupons/models/template-coupon/template-coupon.model';
import { TemplateCouponSelectionFilters } from '../../../../modules/coupons/services/template-coupon/template-coupon-selection-filters.dto';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateTemplateCouponData {
  coupon_kind: TemplateCouponKind;
  coupon_code: string;
  coupon_discount_quantity: number;
  coupon_selection_filters: TemplateCouponSelectionFilters;
}

export class CreateTemplateCouponEvent extends TrackingEvent<CreateTemplateCouponData> {
  constructor(readonly data: CreateTemplateCouponData) {
    super(TrackingEvents.CreateTemplateCoupon, data);
  }
}
