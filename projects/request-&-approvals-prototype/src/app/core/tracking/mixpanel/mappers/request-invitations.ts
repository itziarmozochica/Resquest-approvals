import { RequestInvitationsEvent } from '../../core/events/request-invitations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class RequestInvitationsMapper implements MixpanelTrackingMapper<RequestInvitationsEvent> {
  map(event: RequestInvitationsEvent): MixpanelEvent {
    return new MixpanelEvent('request_invitations', event.data);
  }
}
