import { ClickConfirmExtendDatesCalendarEvent } from '../../core/events/click-confirm-extend-dates-calendar';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickConfirmExtendDatesCalendarMapper implements MixpanelTrackingMapper<ClickConfirmExtendDatesCalendarEvent> {
  map(event: ClickConfirmExtendDatesCalendarEvent): MixpanelEvent {
    return new MixpanelEvent('click_confirm_extend_dates_calendar', event.data);
  }
}
