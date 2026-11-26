import { SingleInvitationIssuedEvent } from '../../core/events/single-invitation-issued';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SingleInvitationIssuedMapper implements MixpanelTrackingMapper<SingleInvitationIssuedEvent> {
  map(event: SingleInvitationIssuedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_single_issued', event.data);
  }
}
