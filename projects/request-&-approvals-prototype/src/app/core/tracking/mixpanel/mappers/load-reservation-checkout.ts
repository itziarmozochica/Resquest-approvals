import { LoadReservationCheckoutEvent } from '../../core/events/load-reservation-checkout';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadReservationCheckoutMapper implements MixpanelTrackingMapper<LoadReservationCheckoutEvent> {
  map(event: LoadReservationCheckoutEvent): MixpanelEvent {
    return new MixpanelEvent('load_reservation_checkout', event.data);
  }
}
