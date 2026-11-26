import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickTicketsPerTimeslotEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickTicketsPerTimeslot);
  }
}
