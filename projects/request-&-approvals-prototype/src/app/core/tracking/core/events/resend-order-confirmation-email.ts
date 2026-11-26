import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ResendOrderConfirmationEmailData {
  order_id: number;
  original_buyer_email: string;
  recipient_email: string;
}

export class ResendOrderConfirmationEmailEvent extends TrackingEvent<ResendOrderConfirmationEmailData> {
  constructor(readonly data: ResendOrderConfirmationEmailData) {
    super(TrackingEvents.ResendOrderConfirmationEmail, data);
  }
}
