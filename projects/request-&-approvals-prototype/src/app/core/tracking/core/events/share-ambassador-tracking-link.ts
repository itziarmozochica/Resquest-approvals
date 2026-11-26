import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ShareAmbassadorTrackingLinkData {
  time: string;
  program_id: string;
  user_id: string;
  plan_id: string;
  channel_id: string;
  partner_id: number;
  success: boolean;
  error_code?: string;
}

export class ShareAmbassadorTrackingLinkEvent extends TrackingEvent<ShareAmbassadorTrackingLinkData> {
  constructor(readonly data: ShareAmbassadorTrackingLinkData) {
    super(TrackingEvents.ShareAmbassadorTrackingLink, data);
  }
}
