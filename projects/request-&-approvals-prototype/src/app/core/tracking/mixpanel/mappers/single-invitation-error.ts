import { SingleInvitationErrorEvent } from '../../core/events/single-invitation-error';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SingleInvitationErrorMapper implements MixpanelTrackingMapper<SingleInvitationErrorEvent> {
  map(event: SingleInvitationErrorEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_single_error', event.data);
  }
}
