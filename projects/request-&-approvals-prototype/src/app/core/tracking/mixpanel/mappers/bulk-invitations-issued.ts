import { BulkInvitationsIssuedEvent } from '../../core/events/bulk-invitations-issued';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class BulkInvitationsIssuedMapper implements MixpanelTrackingMapper<BulkInvitationsIssuedEvent> {
  map(event: BulkInvitationsIssuedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_bulk_issued', event.data);
  }
}
