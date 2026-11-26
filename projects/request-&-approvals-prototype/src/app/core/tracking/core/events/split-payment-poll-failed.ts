import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentPollFailedData {
  cart_id: string;
  partner_id: number;
  transaction_id: string;
}

export class SplitPaymentPollFailedEvent extends TrackingEvent<SplitPaymentPollFailedData> {
  constructor(readonly data: SplitPaymentPollFailedData) {
    super(TrackingEvents.SplitPaymentPollFailed, data);
  }
}
