import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SendWalletPassesTrackingData {
  ticket_id: number;
  original_buyer_email: string;
  recipient_email: string;
}

export class SendWalletPassesEvent extends TrackingEvent<SendWalletPassesTrackingData> {
  constructor(readonly data: SendWalletPassesTrackingData) {
    super(TrackingEvents.SendWalletPasses, data);
  }
}
