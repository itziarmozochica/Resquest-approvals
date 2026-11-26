import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface BulkInvitationsStartedData {
  plan_id: number;
  total_attempted: number;
  notification_type: string;
  has_seating: boolean;
  session_ids?: number[];
  session_count?: number;
  is_multi_session?: boolean;
}

export class BulkInvitationsStartedEvent extends TrackingEvent<BulkInvitationsStartedData> {
  constructor(readonly data: BulkInvitationsStartedData) {
    super(TrackingEvents.BulkInvitationsStarted, data);
  }
}
