import { ConfirmEditSessionEvent } from '../../core/events/confirm-edit-session';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmEditSessionMapper implements MixpanelTrackingMapper<ConfirmEditSessionEvent> {
  map(event: ConfirmEditSessionEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_edit_session', event.data);
  }
}
