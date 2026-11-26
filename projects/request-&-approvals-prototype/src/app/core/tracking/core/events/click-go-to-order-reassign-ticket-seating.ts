import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickGoToOrderReassignTicketSeatingData {
  orderId: number;
}

export class ClickGoToOrderReassignTicketSeatingEvent extends TrackingEvent<ClickGoToOrderReassignTicketSeatingData> {
  constructor(readonly data: ClickGoToOrderReassignTicketSeatingData) {
    super(TrackingEvents.ClickGoToOrderReassignTicketSeating, data);
  }
}
