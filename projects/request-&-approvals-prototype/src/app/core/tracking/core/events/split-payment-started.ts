import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SplitPaymentStartedData {
  cart_id: string;
  currency: string;
  device_id?: string;
  flow_type: 'progress_modal' | 'waiting_modal';
  obo_flow_type?: string;
  partner_id: number;
  payment_gateway: string;
  place_id: number;
  plan_id: number;
  total_amount?: number;
  transaction_id: string;
  user_id: number;
}

export class SplitPaymentStartedEvent extends TrackingEvent<SplitPaymentStartedData> {
  constructor(readonly data: SplitPaymentStartedData) {
    super(TrackingEvents.SplitPaymentStarted, data);
  }
}
