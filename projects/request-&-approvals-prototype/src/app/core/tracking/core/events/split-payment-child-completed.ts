import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildCompletedData {
  amount: number;
  cart_id: string;
  child_transaction_id: string;
  partner_id: number;
  split_index: number;
  status: string;
  transaction_id: string;
}

export class SplitPaymentChildCompletedEvent extends TrackingEvent<SplitPaymentChildCompletedData> {
  constructor(readonly data: SplitPaymentChildCompletedData) {
    super(TrackingEvents.SplitPaymentChildCompleted, data);
  }
}
