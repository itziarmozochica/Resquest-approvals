import { ClickCalendarTimeSlotEvent } from '../../core/events/click-calendar-time-slot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickCalendarTimeSlotMapper implements MixpanelTrackingMapper<ClickCalendarTimeSlotEvent> {
  map(event: ClickCalendarTimeSlotEvent): MixpanelEvent {
    return new MixpanelEvent('click_calendar_time_slot', event.data);
  }
}
