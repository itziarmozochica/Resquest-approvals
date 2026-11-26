import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentCancelledData {
  cart_id: string;
  partner_id: number;
  place_id: number;
  plan_id: number;
  transaction_id: string;
}

export class SplitPaymentCancelledEvent extends TrackingEvent<SplitPaymentCancelledData> {
  constructor(readonly data: SplitPaymentCancelledData) {
    super(TrackingEvents.SplitPaymentCancelled, data);
  }
}
