import { SingleInvitationStartedEvent } from '../../core/events/single-invitation-started';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SingleInvitationStartedMapper implements MixpanelTrackingMapper<SingleInvitationStartedEvent> {
  map(event: SingleInvitationStartedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_single_started', event.data);
  }
}
