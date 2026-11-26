import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickOnCreateInvitationsData {
  plan_id?: number;
}

export class ClickOnCreateInvitationsEvent extends TrackingEvent<ClickOnCreateInvitationsData> {
  constructor(readonly data: ClickOnCreateInvitationsData) {
    super(TrackingEvents.ClickOnCreateInvitations, data);
  }
}
