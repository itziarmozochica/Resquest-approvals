import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildCancelFailedData {
  cart_id: string;
  child_transaction_id: string;
  error: string;
  partner_id: number;
  transaction_id: string;
}

export class SplitPaymentChildCancelFailedEvent extends TrackingEvent<SplitPaymentChildCancelFailedData> {
  constructor(readonly data: SplitPaymentChildCancelFailedData) {
    super(TrackingEvents.SplitPaymentChildCancelFailed, data);
  }
}
