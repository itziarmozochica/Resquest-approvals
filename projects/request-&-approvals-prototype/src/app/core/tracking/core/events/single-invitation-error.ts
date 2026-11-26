import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SingleInvitationErrorData {
  plan_id: number;
  error_message?: string;
  error_code?: string | number;
}

export class SingleInvitationErrorEvent extends TrackingEvent<SingleInvitationErrorData> {
  constructor(readonly data: SingleInvitationErrorData) {
    super(TrackingEvents.SingleInvitationError, data);
  }
}
