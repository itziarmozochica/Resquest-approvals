import { ConfirmEditCodePoolStatusAndVisibilityEvent } from '../../core/events/confirm-edit-code-pool-status-and-visibility';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmEditCodePoolStatusAndVisibilityMapper implements MixpanelTrackingMapper<ConfirmEditCodePoolStatusAndVisibilityEvent> {
  map(event: ConfirmEditCodePoolStatusAndVisibilityEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_edit_code_pool_status_and_visibility', event.data);
  }
}
