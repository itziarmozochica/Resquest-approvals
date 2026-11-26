import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmIncreaseTicketCapacityData {
  plan_id: number;
  plan_name: string;
  session_id: number;
  session_name: string;
  session_date: string;
  ticket_increase_amount: number;
}

export class ConfirmIncreaseTicketCapacityEvent extends TrackingEvent<ConfirmIncreaseTicketCapacityData> {
  constructor(readonly data: ConfirmIncreaseTicketCapacityData) {
    super(TrackingEvents.ConfirmIncreaseTicketCapacity, data);
  }
}
