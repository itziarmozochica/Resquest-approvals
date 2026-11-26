import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface RequestInvitationsData {
  plan_id: number;
  tickets: number;
  guests: number;
  notification_type: string;
  has_seating: boolean;
  cart_id?: string;
  session_id?: number;
  session_ids?: number[];
  session_count?: number;
  is_multi_session?: boolean;
  invitation_type?: 'single' | 'bulk';
}

export class RequestInvitationsEvent extends TrackingEvent<RequestInvitationsData> {
  constructor(readonly data: RequestInvitationsData) {
    super(TrackingEvents.RequestInvitations, data);
  }
}
