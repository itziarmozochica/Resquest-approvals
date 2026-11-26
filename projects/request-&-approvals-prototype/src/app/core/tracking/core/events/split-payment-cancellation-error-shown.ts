import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentCancellationErrorShownData {
  cart_id: string;
  partner_id: number;
  transaction_id: string;
}

export class SplitPaymentCancellationErrorShownEvent extends TrackingEvent<SplitPaymentCancellationErrorShownData> {
  constructor(readonly data: SplitPaymentCancellationErrorShownData) {
    super(TrackingEvents.SplitPaymentCancellationErrorShown, data);
  }
}
