import { ClickMakeReservationEvent } from '../../core/events/click-make-reservation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickMakeReservationMapper implements MixpanelTrackingMapper<ClickMakeReservationEvent> {
  map(event: ClickMakeReservationEvent): MixpanelEvent {
    return new MixpanelEvent('click_make_reservation', event.data);
  }
}
