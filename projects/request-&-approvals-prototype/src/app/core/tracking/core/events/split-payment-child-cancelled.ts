import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildCancelledData {
  cart_id: string;
  child_transaction_id: string;
  partner_id: number;
  split_index: number;
  transaction_id: string;
}

export class SplitPaymentChildCancelledEvent extends TrackingEvent<SplitPaymentChildCancelledData> {
  constructor(readonly data: SplitPaymentChildCancelledData) {
    super(TrackingEvents.SplitPaymentChildCancelled, data);
  }
}
