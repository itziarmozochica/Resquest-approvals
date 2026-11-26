import { ClickGoToMakeNewReservationEvent } from '../../core/events/click-go-to-make-new-reservation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickGoToMakeNewReservationMapper implements MixpanelTrackingMapper<ClickGoToMakeNewReservationEvent> {
  map(event: ClickGoToMakeNewReservationEvent): MixpanelEvent {
    return new MixpanelEvent('click_go_to_make_new_reservation', event.data);
  }
}
