import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class OpenPricesPerTimeslotEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.OpenPricesPerTimeslot);
  }
}
