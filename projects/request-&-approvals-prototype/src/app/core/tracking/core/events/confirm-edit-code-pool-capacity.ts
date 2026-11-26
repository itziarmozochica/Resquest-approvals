import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmEditCodePoolCapacityData {
  plan_id: number;
  code_pool_id: number | string;
  available_codes: number;
  previous_amount: number;
  new_amount: number;
}

export class ConfirmEditCodePoolCapacityEvent extends TrackingEvent<ConfirmEditCodePoolCapacityData> {
  constructor(readonly data: ConfirmEditCodePoolCapacityData) {
    super(TrackingEvents.ConfirmEditCodePoolCapacity, data);
  }
}
