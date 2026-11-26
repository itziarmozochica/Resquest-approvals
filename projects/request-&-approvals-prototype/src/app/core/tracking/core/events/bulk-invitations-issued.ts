import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface BulkInvitationsIssuedData {
  plan_id: number;
  total_attempted: number;
  total_succeeded: number;
  total_failed: number;
  notification_type: string;
  has_seating: boolean;
  session_ids?: number[];
  session_count?: number;
  is_multi_session?: boolean;
  duration_ms: number;
  has_partial_failure: boolean;
}

export class BulkInvitationsIssuedEvent extends TrackingEvent<BulkInvitationsIssuedData> {
  constructor(readonly data: BulkInvitationsIssuedData) {
    super(TrackingEvents.BulkInvitationsIssued, data);
  }
}
