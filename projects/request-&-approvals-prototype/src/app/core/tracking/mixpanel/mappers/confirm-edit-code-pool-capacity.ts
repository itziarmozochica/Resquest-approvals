import { ConfirmEditCodePoolCapacityEvent } from '../../core/events/confirm-edit-code-pool-capacity';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmEditCodePoolCapacityMapper implements MixpanelTrackingMapper<ConfirmEditCodePoolCapacityEvent> {
  map(event: ConfirmEditCodePoolCapacityEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_edit_code_pool_capacity', event.data);
  }
}
