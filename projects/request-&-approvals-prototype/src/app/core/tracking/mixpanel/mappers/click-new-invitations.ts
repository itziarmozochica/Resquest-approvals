import { ClickNewInvitationsEvent } from '../../core/events/click-new-invitations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickNewInvitationsMapper implements MixpanelTrackingMapper<ClickNewInvitationsEvent> {
  map(event: ClickNewInvitationsEvent): MixpanelEvent {
    return new MixpanelEvent('click_new_invitations', event.data);
  }
}
