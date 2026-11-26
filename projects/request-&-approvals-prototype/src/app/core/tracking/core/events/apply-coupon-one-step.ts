import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ApplyCouponData } from './apply-coupon.model';

export class ApplyCouponOneStepEvent extends TrackingEvent<ApplyCouponData> {
  constructor(readonly data: ApplyCouponData) {
    super(TrackingEvents.ApplyCouponOneStep, data);
  }
}
