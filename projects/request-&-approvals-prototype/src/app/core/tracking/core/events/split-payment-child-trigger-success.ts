import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentChildTriggerSuccessData {
  cart_id: string;
  partner_id: number;
  split_index: number;
  transaction_id: string;
}

export class SplitPaymentChildTriggerSuccessEvent extends TrackingEvent<SplitPaymentChildTriggerSuccessData> {
  constructor(readonly data: SplitPaymentChildTriggerSuccessData) {
    super(TrackingEvents.SplitPaymentChildTriggerSuccess, data);
  }
}
