import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SeatChange {
  old_seat: string;
  new_seat: string;
}

export interface ConfirmReassignTicketSeatingData {
  number_of_seats_reassigned: number;
  seat_changes: SeatChange[];
  old_seats_blocked: boolean;
}

export class ConfirmReassignTicketSeatingEvent extends TrackingEvent<ConfirmReassignTicketSeatingData> {
  constructor(readonly data: ConfirmReassignTicketSeatingData) {
    super(TrackingEvents.ConfirmReassignTicketSeating, data);
  }
}
