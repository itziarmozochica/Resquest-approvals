import { ConfirmEditSessionCapacityEvent } from '../../core/events/confirm-edit-session-capacity';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmEditSessionCapacityMapper implements MixpanelTrackingMapper<ConfirmEditSessionCapacityEvent> {
  map(event: ConfirmEditSessionCapacityEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_edit_session_capacity', event.data);
  }
}
