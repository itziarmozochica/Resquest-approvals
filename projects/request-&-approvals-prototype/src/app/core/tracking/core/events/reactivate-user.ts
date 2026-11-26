import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ReactivateUserData {
  name: string;
  email: string;
  role: string;
}

export class ReactivateUserEvent extends TrackingEvent<ReactivateUserData> {
  constructor(readonly data: ReactivateUserData) {
    super(TrackingEvents.ReactivateUser, data);
  }
}
