import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { RequestInvitationsData } from './request-invitations';

export type InvitationsLandingSuccessData = RequestInvitationsData;

export class InvitationsLandingSuccessEvent extends TrackingEvent<InvitationsLandingSuccessData> {
  constructor(readonly data: InvitationsLandingSuccessData) {
    super(TrackingEvents.InvitationsLandingSuccess, data);
  }
}
