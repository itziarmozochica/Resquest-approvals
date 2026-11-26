import { ClickOpenExtendTimeSlotEvent } from '../../core/events/click-open-extend-time-slot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOpenExtendTimeSlotMapper implements MixpanelTrackingMapper<ClickOpenExtendTimeSlotEvent> {
  map(event: ClickOpenExtendTimeSlotEvent): MixpanelEvent {
    return new MixpanelEvent('click_open_extend_time_slot', event.data);
  }
}
