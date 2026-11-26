import { ConfirmTimeSlotModificationEvent } from '../../core/events/confirm-time-slot-modification';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmTimeSlotModificationMapper implements MixpanelTrackingMapper<ConfirmTimeSlotModificationEvent> {
  map(event: ConfirmTimeSlotModificationEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_time_slot_modification', event.data);
  }
}
