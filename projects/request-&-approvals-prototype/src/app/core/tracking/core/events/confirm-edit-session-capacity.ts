import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmEditSessionCapacityData {
  plan_id: number;
  session_id: number;
  session_name: string;
  session_date: string;
  available_tickets: number;
  previous_amount: number;
  new_amount: number;
}

export class ConfirmEditSessionCapacityEvent extends TrackingEvent<ConfirmEditSessionCapacityData> {
  constructor(readonly data: ConfirmEditSessionCapacityData) {
    super(TrackingEvents.ConfirmEditSessionCapacity, data);
  }
}
