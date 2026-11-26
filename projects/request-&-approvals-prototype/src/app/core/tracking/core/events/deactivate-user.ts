import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DeactivateUserData {
  name: string;
  email: string;
  role: string;
}

export class DeactivateUserEvent extends TrackingEvent<DeactivateUserData> {
  constructor(readonly data: DeactivateUserData) {
    super(TrackingEvents.DeactivateUser, data);
  }
}
