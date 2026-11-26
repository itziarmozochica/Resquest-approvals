import { ClickOnSendInvitationsSingleEvent } from '../../core/events/click-on-send-invitations-single';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOnSendInvitationsSingleMapper implements MixpanelTrackingMapper<ClickOnSendInvitationsSingleEvent> {
  map(event: ClickOnSendInvitationsSingleEvent): MixpanelEvent {
    return new MixpanelEvent('click_on_send_invitations_single', event.data);
  }
}
