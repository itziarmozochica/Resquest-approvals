import { ConfirmReassignTicketSeatingEvent } from '@fz-original/app/core/tracking/core/events/confirm-reassign-ticket-seating';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmReassignTicketSeatingMapper implements MixpanelTrackingMapper<ConfirmReassignTicketSeatingEvent> {
  map(event: ConfirmReassignTicketSeatingEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_reassign_ticket_seating', event.data);
  }
}
