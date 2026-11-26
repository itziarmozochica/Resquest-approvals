import { InvitationsBulkModalAcceptedEvent } from '../../core/events/invitations-bulk-modal-accepted';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsBulkModalAcceptedMapper implements MixpanelTrackingMapper<InvitationsBulkModalAcceptedEvent> {
  map(event: InvitationsBulkModalAcceptedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_bulk_modal_accepted', event.data);
  }
}
