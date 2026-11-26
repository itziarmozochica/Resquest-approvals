import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ApplyCouponData } from './apply-coupon.model';

export class ClickApplyCouponEvent extends TrackingEvent<ApplyCouponData> {
  constructor(readonly data: ApplyCouponData) {
    super(TrackingEvents.ClickApplyCoupon, data);
  }
}
