import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentRetryRefundReceiptData {
  cart_id: string;
  partner_id: number;
  success: boolean;
  transaction_id: string;
}

export class SplitPaymentRetryRefundReceiptEvent extends TrackingEvent<SplitPaymentRetryRefundReceiptData> {
  constructor(readonly data: SplitPaymentRetryRefundReceiptData) {
    super(TrackingEvents.SplitPaymentRetryRefundReceipt, data);
  }
}
