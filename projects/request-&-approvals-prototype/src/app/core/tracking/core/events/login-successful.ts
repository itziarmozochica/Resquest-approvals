import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class LoginSuccessfulEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.LoginSuccessful);
  }
}
