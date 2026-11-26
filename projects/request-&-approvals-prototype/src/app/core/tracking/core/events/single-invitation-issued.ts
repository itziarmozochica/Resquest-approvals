import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SingleInvitationIssuedData {
  plan_id: number;
  tickets: number;
  notification_type: string;
  has_seating: boolean;
  cart_id?: string;
  session_id?: number;
  session_ids?: number[];
  session_count?: number;
  is_multi_session?: boolean;
  create_another: boolean;
  duration_ms?: number;
}

export class SingleInvitationIssuedEvent extends TrackingEvent<SingleInvitationIssuedData> {
  constructor(readonly data: SingleInvitationIssuedData) {
    super(TrackingEvents.SingleInvitationIssued, data);
  }
}
