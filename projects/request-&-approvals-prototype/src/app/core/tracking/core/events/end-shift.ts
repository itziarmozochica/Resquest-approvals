import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface EndShiftData {
  cash_register_name: string;
  final_amount: number;
  currency: string;
  user_name: string;
}

export class EndShiftEvent extends TrackingEvent<EndShiftData> {
  constructor(readonly data: EndShiftData) {
    super(TrackingEvents.EndShift, data);
  }
}
