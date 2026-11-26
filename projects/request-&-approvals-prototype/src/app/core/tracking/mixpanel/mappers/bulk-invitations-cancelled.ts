import { BulkInvitationsCancelledEvent } from '../../core/events/bulk-invitations-cancelled';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class BulkInvitationsCancelledMapper implements MixpanelTrackingMapper<BulkInvitationsCancelledEvent> {
  map(event: BulkInvitationsCancelledEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_bulk_cancelled', event.data);
  }
}
