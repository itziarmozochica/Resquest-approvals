import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickNewConcessionEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickNewConcession);
  }
}
