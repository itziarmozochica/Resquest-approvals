import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickWhitelabelList extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickWhitelabelList);
  }
}
