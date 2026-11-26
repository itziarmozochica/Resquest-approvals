import { ClickGoToReservationDetailsEvent } from '../../core/events/click-go-to-reservation-details';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickGoToReservationDetailsMapper implements MixpanelTrackingMapper<ClickGoToReservationDetailsEvent> {
  map(event: ClickGoToReservationDetailsEvent): MixpanelEvent {
    return new MixpanelEvent('click_go_to_reservation_details', event.data);
  }
}
