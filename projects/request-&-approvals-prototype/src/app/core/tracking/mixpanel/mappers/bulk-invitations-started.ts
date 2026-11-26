import { BulkInvitationsStartedEvent } from '../../core/events/bulk-invitations-started';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class BulkInvitationsStartedMapper implements MixpanelTrackingMapper<BulkInvitationsStartedEvent> {
  map(event: BulkInvitationsStartedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_bulk_started', event.data);
  }
}
