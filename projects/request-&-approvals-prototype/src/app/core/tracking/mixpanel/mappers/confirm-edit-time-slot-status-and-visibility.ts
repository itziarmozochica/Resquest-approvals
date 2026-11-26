import { ConfirmEditTimeSlotStatusAndVisibilityEvent } from '../../core/events/confirm-edit-time-slot-status-and-visibility';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmEditTimeSlotStatusAndVisibilityMapper implements MixpanelTrackingMapper<ConfirmEditTimeSlotStatusAndVisibilityEvent> {
  map(event: ConfirmEditTimeSlotStatusAndVisibilityEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_edit_time_slot_status_and_visibility', event.data);
  }
}
