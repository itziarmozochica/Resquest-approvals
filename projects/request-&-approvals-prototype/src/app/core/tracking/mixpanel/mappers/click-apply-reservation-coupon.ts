import { ClickApplyReservationCouponEvent } from '../../core/events/click-apply-reservation-coupon';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickApplyReservationCouponMapper implements MixpanelTrackingMapper<ClickApplyReservationCouponEvent> {
  map(event: ClickApplyReservationCouponEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation|Coupon|Click Apply', event.data);
  }
}
