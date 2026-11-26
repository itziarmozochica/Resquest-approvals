import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickBusinessesEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickBusinesses);
  }
}
