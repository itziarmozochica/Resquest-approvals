import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildTriggeredData {
  cart_id: string;
  partner_id: number;
  split_index: number;
  transaction_id: string;
}

export class SplitPaymentChildTriggeredEvent extends TrackingEvent<SplitPaymentChildTriggeredData> {
  constructor(readonly data: SplitPaymentChildTriggeredData) {
    super(TrackingEvents.SplitPaymentChildTriggered, data);
  }
}
