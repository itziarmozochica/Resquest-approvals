import { CancelTimeSlotModificationEvent } from '../../core/events/cancel-time-slot-modification';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CancelTimeSlotModificationMapper implements MixpanelTrackingMapper<CancelTimeSlotModificationEvent> {
  map(event: CancelTimeSlotModificationEvent): MixpanelEvent {
    return new MixpanelEvent('cancel_time_slot_modification', event.data);
  }
}
