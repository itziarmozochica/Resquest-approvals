import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildFailedData {
  cart_id: string;
  child_transaction_id: string;
  partner_id: number;
  split_index: number;
  status: string;
  transaction_id: string;
}

export class SplitPaymentChildFailedEvent extends TrackingEvent<SplitPaymentChildFailedData> {
  constructor(readonly data: SplitPaymentChildFailedData) {
    super(TrackingEvents.SplitPaymentChildFailed, data);
  }
}
