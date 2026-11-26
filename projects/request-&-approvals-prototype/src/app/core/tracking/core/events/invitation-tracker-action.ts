import { TrackingEvent } from '../../tracking-event';

export interface InvitationTrackerData {
  invitation_id: string;
  original_buyer_email: string;
  recipient_email: string;
  ticket_ids: number[];
}

export class InvitationTrackerActionEvent extends TrackingEvent<InvitationTrackerData> {
  constructor(
    event: string,
    readonly data: InvitationTrackerData,
  ) {
    super(event, data);
  }
}
