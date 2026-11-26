import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildTriggerFailedData {
  cart_id: string;
  error: string;
  partner_id: number;
  split_index: number;
  transaction_id: string;
}

export class SplitPaymentChildTriggerFailedEvent extends TrackingEvent<SplitPaymentChildTriggerFailedData> {
  constructor(readonly data: SplitPaymentChildTriggerFailedData) {
    super(TrackingEvents.SplitPaymentChildTriggerFailed, data);
  }
}
