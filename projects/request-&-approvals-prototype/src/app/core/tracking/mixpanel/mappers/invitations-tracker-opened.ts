import { InvitationsTrackerOpenedEvent } from '../../core/events/invitations-tracker-opened';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsTrackerOpenedMapper implements MixpanelTrackingMapper<InvitationsTrackerOpenedEvent> {
  map(event: InvitationsTrackerOpenedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_tracker_opened', event.data);
  }
}
