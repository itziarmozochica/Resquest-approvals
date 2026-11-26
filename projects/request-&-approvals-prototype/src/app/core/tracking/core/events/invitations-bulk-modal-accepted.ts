import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InvitationsBulkModalAcceptedData {
  plan_id: number;
  total_attempted: number;
  total_succeeded: number;
  total_failed: number;
}

export class InvitationsBulkModalAcceptedEvent extends TrackingEvent<InvitationsBulkModalAcceptedData> {
  constructor(readonly data: InvitationsBulkModalAcceptedData) {
    super(TrackingEvents.InvitationsBulkModalAccepted, data);
  }
}
