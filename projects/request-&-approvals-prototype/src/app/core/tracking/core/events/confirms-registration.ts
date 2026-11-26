import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmsRegistrationData {
  signup_source?: string;
}

export class ConfirmsRegistrationEvent extends TrackingEvent<ConfirmsRegistrationData> {
  constructor(readonly data: ConfirmsRegistrationData) {
    super(TrackingEvents.ConfirmsRegistration, data);
  }
}
