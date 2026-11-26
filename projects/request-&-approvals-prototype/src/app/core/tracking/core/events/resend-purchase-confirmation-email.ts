import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ResendPurchaseConfirmationEmailData {
  original_buyer_email: string;
  recipient_email: string;
  ticket_id: number;
}

export class ResendPurchaseConfirmationEmailEvent extends TrackingEvent<ResendPurchaseConfirmationEmailData> {
  constructor(readonly data: ResendPurchaseConfirmationEmailData) {
    super(TrackingEvents.ResendPurchaseConfirmationEmail, data);
  }
}
