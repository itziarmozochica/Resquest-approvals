import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickOrdersBulkRescheduleEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickOrdersBulkReschedule);
  }
}
