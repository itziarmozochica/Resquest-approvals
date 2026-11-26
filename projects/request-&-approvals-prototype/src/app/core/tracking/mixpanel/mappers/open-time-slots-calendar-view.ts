import { OpenTimeSlotsCalendarViewEvent } from '../../core/events/open-time-slots-calendar-view';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenTimeSlotsCalendarViewMapper implements MixpanelTrackingMapper<OpenTimeSlotsCalendarViewEvent> {
  map(event: OpenTimeSlotsCalendarViewEvent): MixpanelEvent {
    return new MixpanelEvent('open_time_slots_calendar_view', event.data);
  }
}
