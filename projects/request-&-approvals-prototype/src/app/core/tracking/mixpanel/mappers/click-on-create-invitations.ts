import { ClickOnCreateInvitationsEvent } from '../../core/events/click-on-create-invitations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOnCreateInvitationsMapper implements MixpanelTrackingMapper<ClickOnCreateInvitationsEvent> {
  map(event: ClickOnCreateInvitationsEvent): MixpanelEvent {
    return new MixpanelEvent('click_on_create_invitations', event.data);
  }
}
