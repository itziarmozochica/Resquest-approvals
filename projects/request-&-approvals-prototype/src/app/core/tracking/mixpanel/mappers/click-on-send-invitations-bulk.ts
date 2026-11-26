import { ClickOnSendInvitationsBulkEvent } from '../../core/events/click-on-send-invitations-bulk';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOnSendInvitationsBulkMapper implements MixpanelTrackingMapper<ClickOnSendInvitationsBulkEvent> {
  map(event: ClickOnSendInvitationsBulkEvent): MixpanelEvent {
    return new MixpanelEvent('click_on_send_invitations_bulk', event.data);
  }
}
