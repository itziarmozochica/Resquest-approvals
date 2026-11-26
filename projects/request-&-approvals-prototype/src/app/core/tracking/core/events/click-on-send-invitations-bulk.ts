import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickOnSendInvitationsBulkData {
  plan_id: number;
}

export class ClickOnSendInvitationsBulkEvent extends TrackingEvent<ClickOnSendInvitationsBulkData> {
  constructor(readonly data: ClickOnSendInvitationsBulkData) {
    super(TrackingEvents.ClickOnSendInvitationsBulk, data);
  }
}
