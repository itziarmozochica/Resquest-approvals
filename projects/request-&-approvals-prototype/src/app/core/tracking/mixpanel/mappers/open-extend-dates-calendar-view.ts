import { OpenExtendDatesCalendarViewEvent } from '../../core/events/open-extend-dates-calendar-view';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenExtendDatesCalendarViewMapper implements MixpanelTrackingMapper<OpenExtendDatesCalendarViewEvent> {
  map(event: OpenExtendDatesCalendarViewEvent): MixpanelEvent {
    return new MixpanelEvent('open_extend_dates_calendar_view', event.data);
  }
}
