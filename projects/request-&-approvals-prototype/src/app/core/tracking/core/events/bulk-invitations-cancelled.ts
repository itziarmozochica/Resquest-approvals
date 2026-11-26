import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface BulkInvitationsCancelledData {
  plan_id: number;
  total_attempted: number;
  completed_before_cancel: number;
}

export class BulkInvitationsCancelledEvent extends TrackingEvent<BulkInvitationsCancelledData> {
  constructor(readonly data: BulkInvitationsCancelledData) {
    super(TrackingEvents.BulkInvitationsCancelled, data);
  }
}
