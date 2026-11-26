import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CopyAmbassadorTrackingLinkData {
  time: string;
  program_id: string;
  user_id: string;
  plan_id: string;
  channel_id: string;
  partner_id: number;
  success: boolean;
  error_code?: string;
}

export class CopyAmbassadorTrackingLinkEvent extends TrackingEvent<CopyAmbassadorTrackingLinkData> {
  constructor(readonly data: CopyAmbassadorTrackingLinkData) {
    super(TrackingEvents.CopyAmbassadorTrackingLink, data);
  }
}
