import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildCancelSuccessData {
  cart_id: string;
  child_transaction_id: string;
  partner_id: number;
  transaction_id: string;
}

export class SplitPaymentChildCancelSuccessEvent extends TrackingEvent<SplitPaymentChildCancelSuccessData> {
  constructor(readonly data: SplitPaymentChildCancelSuccessData) {
    super(TrackingEvents.SplitPaymentChildCancelSuccess, data);
  }
}
