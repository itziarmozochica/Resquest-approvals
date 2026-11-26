import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class OpenValidateTicketsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.OpenValidateTickets);
  }
}
