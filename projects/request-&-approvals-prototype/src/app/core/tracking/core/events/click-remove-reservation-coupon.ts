import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { RemoveReservationCouponData } from './remove-reservation-coupon.model';

export class ClickRemoveReservationCouponEvent extends TrackingEvent<RemoveReservationCouponData> {
  constructor(readonly data: RemoveReservationCouponData) {
    super(TrackingEvents.ClickRemoveReservationCoupon, data);
  }
}
