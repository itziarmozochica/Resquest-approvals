import { AttendeeSelectedViewEvent } from '../../core/events/attendee-select-view';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class AttendeeSelectedViewMapper implements MixpanelTrackingMapper<AttendeeSelectedViewEvent> {
  map(event: AttendeeSelectedViewEvent): MixpanelEvent {
    return new MixpanelEvent('attendee_selected_view', event.data);
  }
}
