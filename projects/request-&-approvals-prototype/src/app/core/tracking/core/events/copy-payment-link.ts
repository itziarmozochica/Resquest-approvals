import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CopyPaymentLinkData {
  application_id: string;
  application_name: string;
  cart_id: string;
  language: string;
  payment_link: string;
  plan_id: number;
}

export class CopyPaymentLinkEvent extends TrackingEvent<CopyPaymentLinkData> {
  constructor(readonly data: CopyPaymentLinkData) {
    super(TrackingEvents.CopyPaymentLink, data);
  }
}
