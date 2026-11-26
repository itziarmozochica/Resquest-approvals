import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickResellersEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickResellers);
  }
}
