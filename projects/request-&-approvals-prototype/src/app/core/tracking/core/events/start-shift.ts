import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface StartShiftData {
  cash_register_name: string;
  initial_amount: number;
  currency: string;
  user_name: string;
}

export class StartShiftEvent extends TrackingEvent<StartShiftData> {
  constructor(readonly data: StartShiftData) {
    super(TrackingEvents.StartShift, data);
  }
}
