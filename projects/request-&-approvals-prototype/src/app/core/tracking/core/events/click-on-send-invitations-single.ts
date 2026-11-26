import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickOnSendInvitationsSingleData {
  plan_id: number;
}

export class ClickOnSendInvitationsSingleEvent extends TrackingEvent<ClickOnSendInvitationsSingleData> {
  constructor(readonly data: ClickOnSendInvitationsSingleData) {
    super(TrackingEvents.ClickOnSendInvitationsSingle, data);
  }
}
