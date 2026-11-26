import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SingleInvitationStartedData {
  plan_id: number;
  tickets: number;
  notification_type: string;
  has_seating: boolean;
  session_ids?: number[];
  session_count?: number;
  is_multi_session?: boolean;
}

export class SingleInvitationStartedEvent extends TrackingEvent<SingleInvitationStartedData> {
  constructor(readonly data: SingleInvitationStartedData) {
    super(TrackingEvents.SingleInvitationStarted, data);
  }
}
