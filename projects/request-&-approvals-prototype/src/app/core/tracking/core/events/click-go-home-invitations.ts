import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ConfirmInvitationData } from './confirm-invitation-data';

export class ClickGoHomeInvitationsEvent extends TrackingEvent<ConfirmInvitationData> {
  constructor(readonly data: ConfirmInvitationData) {
    super(TrackingEvents.ClickGoHomeInvitations, data);
  }
}
