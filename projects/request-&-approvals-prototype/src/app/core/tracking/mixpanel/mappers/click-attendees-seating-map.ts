import { ClickAttendeesSeatingMapEvent } from '../../core/events/click-attendees-seating-map';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickAttendeesSeatingMapMapper implements MixpanelTrackingMapper<ClickAttendeesSeatingMapEvent> {
  map(event: ClickAttendeesSeatingMapEvent): MixpanelEvent {
    return new MixpanelEvent('click_attendees_seating_map', event.data);
  }
}
