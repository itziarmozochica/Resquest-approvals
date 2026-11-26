import { RequestReassignTicketSeatingPaginationEvent } from '@fz-original/app/core/tracking/core/events/request-reassign-ticket-seating-pagination';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class RequestReassignTicketSeatingPaginationMapper implements MixpanelTrackingMapper<RequestReassignTicketSeatingPaginationEvent> {
  map(event: RequestReassignTicketSeatingPaginationEvent): MixpanelEvent {
    return new MixpanelEvent('request_reassign_ticket_seating_pagination', event.data);
  }
}
