import { ClickGoHomeInvitationsEvent } from '../../core/events/click-go-home-invitations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickGoHomeInvitationsMapper implements MixpanelTrackingMapper<ClickGoHomeInvitationsEvent> {
  map(event: ClickGoHomeInvitationsEvent): MixpanelEvent {
    return new MixpanelEvent('click_go_home_invitations', event.data);
  }
}
