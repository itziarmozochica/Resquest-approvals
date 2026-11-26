import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type OpenReassignTicketSeatingSource = 'schedule_and_tickets' | 'order_detail_whole_order' | 'order_detail_single_ticket';

export interface OpenReassignTicketSeatingData {
  source: OpenReassignTicketSeatingSource;
  orderId?: number;
  ticketId?: number;
}

export class OpenReassignTicketSeatingEvent extends TrackingEvent<OpenReassignTicketSeatingData> {
  constructor(readonly data: OpenReassignTicketSeatingData) {
    super(TrackingEvents.OpenReassignTicketSeating, data);
  }
}
