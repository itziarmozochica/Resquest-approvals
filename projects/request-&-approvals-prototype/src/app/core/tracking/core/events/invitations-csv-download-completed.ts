import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InvitationsCsvDownloadCompletedData {
  plan_id: number;
  invitations_count: number;
  file_type: string;
  duration_ms: number;
}

export class InvitationsCsvDownloadCompletedEvent extends TrackingEvent<InvitationsCsvDownloadCompletedData> {
  constructor(readonly data: InvitationsCsvDownloadCompletedData) {
    super(TrackingEvents.InvitationsCsvDownloadCompleted, data);
  }
}
