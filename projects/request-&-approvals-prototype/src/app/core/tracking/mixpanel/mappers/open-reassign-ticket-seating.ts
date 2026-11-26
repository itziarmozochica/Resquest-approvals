import { OpenReassignTicketSeatingEvent } from '@fz-original/app/core/tracking/core/events/open-reassign-ticket-seating';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenReassignTicketSeatingMapper implements MixpanelTrackingMapper<OpenReassignTicketSeatingEvent> {
  map(event: OpenReassignTicketSeatingEvent): MixpanelEvent {
    return new MixpanelEvent('open_reassign_ticket_seating', event.data);
  }
}
