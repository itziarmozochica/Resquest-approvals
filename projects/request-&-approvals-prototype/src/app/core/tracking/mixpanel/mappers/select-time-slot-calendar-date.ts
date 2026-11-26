import { SelectTimeSlotCalendarDateEvent } from '../../core/events/select-time-slot-calendar-date';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SelectTimeSlotCalendarDateMapper implements MixpanelTrackingMapper<SelectTimeSlotCalendarDateEvent> {
  map(event: SelectTimeSlotCalendarDateEvent): MixpanelEvent {
    return new MixpanelEvent('select_time_slot_calendar_date', event.data);
  }
}
