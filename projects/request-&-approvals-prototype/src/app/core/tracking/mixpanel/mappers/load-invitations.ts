import { LoadInvitationsEvent } from '../../core/events/load-invitations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadInvitationsMapper implements MixpanelTrackingMapper<LoadInvitationsEvent> {
  map(event: LoadInvitationsEvent): MixpanelEvent {
    return new MixpanelEvent('load_invitations', event.data);
  }
}
