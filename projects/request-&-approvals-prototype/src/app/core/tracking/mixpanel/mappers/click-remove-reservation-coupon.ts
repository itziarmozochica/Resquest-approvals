import { ClickRemoveReservationCouponEvent } from '../../core/events/click-remove-reservation-coupon';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickRemoveReservationCouponMapper implements MixpanelTrackingMapper<ClickRemoveReservationCouponEvent> {
  map(event: ClickRemoveReservationCouponEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation|Coupon|Click Remove', event.data);
  }
}
