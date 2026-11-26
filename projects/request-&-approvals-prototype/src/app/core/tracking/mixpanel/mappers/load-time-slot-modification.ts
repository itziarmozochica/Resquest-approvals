import { LoadTimeSlotModificationEvent } from '../../core/events/load-time-slot-modification';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadTimeSlotModificationMapper implements MixpanelTrackingMapper<LoadTimeSlotModificationEvent> {
  map(event: LoadTimeSlotModificationEvent): MixpanelEvent {
    return new MixpanelEvent('load_time_slot_modification', event.data);
  }
}
