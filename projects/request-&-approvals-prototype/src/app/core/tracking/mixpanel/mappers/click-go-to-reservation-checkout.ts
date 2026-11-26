import { ClickGoToReservationCheckoutEvent } from '../../core/events/click-go-to-reservation-checkout';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickGoToReservationCheckoutMapper implements MixpanelTrackingMapper<ClickGoToReservationCheckoutEvent> {
  map(event: ClickGoToReservationCheckoutEvent): MixpanelEvent {
    return new MixpanelEvent('click_go_to_reservation_checkout', event.data);
  }
}
