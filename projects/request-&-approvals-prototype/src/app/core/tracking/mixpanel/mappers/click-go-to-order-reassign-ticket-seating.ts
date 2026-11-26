import { ClickGoToOrderReassignTicketSeatingEvent } from '@fz-original/app/core/tracking/core/events/click-go-to-order-reassign-ticket-seating';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickGoToOrderReassignTicketSeatingMapper implements MixpanelTrackingMapper<ClickGoToOrderReassignTicketSeatingEvent> {
  map(event: ClickGoToOrderReassignTicketSeatingEvent): MixpanelEvent {
    return new MixpanelEvent('click_go_to_order_reassign_ticket_seating', event.data);
  }
}
