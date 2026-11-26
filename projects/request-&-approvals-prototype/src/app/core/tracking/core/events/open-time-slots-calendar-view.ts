import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class OpenTimeSlotsCalendarViewEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.OpenTimeSlotsCalendarView);
  }
}
