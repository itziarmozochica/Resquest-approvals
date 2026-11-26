import { InvitationsLandingSuccessEvent } from '../../core/events/invitations-landing-success';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsLandingSuccessMapper implements MixpanelTrackingMapper<InvitationsLandingSuccessEvent> {
  map(event: InvitationsLandingSuccessEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_landing_success', event.data);
  }
}
