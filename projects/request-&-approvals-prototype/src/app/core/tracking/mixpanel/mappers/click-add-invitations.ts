import { ClickAddInvitationsEvent } from '../../core/events/click-add-invitations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickAddInvitationsMapper implements MixpanelTrackingMapper<ClickAddInvitationsEvent> {
  map(event: ClickAddInvitationsEvent): MixpanelEvent {
    return new MixpanelEvent('click_add_invitations', event.data);
  }
}
