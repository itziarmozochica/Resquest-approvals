import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentCompletedData {
  cart_id: string;
  currency: string;
  order_id?: number;
  partner_id: number;
  split_count: number;
  total_amount: number;
  transaction_id: string;
}

export class SplitPaymentCompletedEvent extends TrackingEvent<SplitPaymentCompletedData> {
  constructor(readonly data: SplitPaymentCompletedData) {
    super(TrackingEvents.SplitPaymentCompleted, data);
  }
}
