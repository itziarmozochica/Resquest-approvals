import { ConfirmExtendTimeSlotEvent } from '../../core/events/confirm-extend-time-slot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmExtendTimeSlotMapper implements MixpanelTrackingMapper<ConfirmExtendTimeSlotEvent> {
  map(event: ConfirmExtendTimeSlotEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_extend_time_slot', event.data);
  }
}
