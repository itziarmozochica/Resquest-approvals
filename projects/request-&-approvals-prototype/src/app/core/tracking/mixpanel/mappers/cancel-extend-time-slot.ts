import { CancelExtendTimeSlotEvent } from '../../core/events/cancel-extend-time-slot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CancelExtendTimeSlotMapper implements MixpanelTrackingMapper<CancelExtendTimeSlotEvent> {
  map(event: CancelExtendTimeSlotEvent): MixpanelEvent {
    return new MixpanelEvent('cancel_extend_time_slot', event.data);
  }
}
