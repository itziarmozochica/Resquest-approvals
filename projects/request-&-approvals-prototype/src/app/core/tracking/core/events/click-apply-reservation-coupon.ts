import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ApplyReservationCouponData } from './apply-reservation-coupon.model';

export class ClickApplyReservationCouponEvent extends TrackingEvent<ApplyReservationCouponData> {
  constructor(readonly data: ApplyReservationCouponData) {
    super(TrackingEvents.ClickApplyReservationCoupon, data);
  }
}
