import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InvitationsCsvDownloadErrorData {
  plan_id: number;
  error_message?: string;
  generic_error?: boolean;
}

export class InvitationsCsvDownloadErrorEvent extends TrackingEvent<InvitationsCsvDownloadErrorData> {
  constructor(readonly data: InvitationsCsvDownloadErrorData) {
    super(TrackingEvents.InvitationsCsvDownloadError, data);
  }
}
