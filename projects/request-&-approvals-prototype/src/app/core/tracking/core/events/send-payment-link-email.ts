import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SendPaymentLinkEmailData {
  application_id: string;
  application_name: string;
  cart_id: string;
  language: string;
  payment_link: string;
  plan_id: number;
}

export class SendPaymentLinkEmailEvent extends TrackingEvent<SendPaymentLinkEmailData> {
  constructor(readonly data: SendPaymentLinkEmailData) {
    super(TrackingEvents.SendPaymentLinkEmail, data);
  }
}
