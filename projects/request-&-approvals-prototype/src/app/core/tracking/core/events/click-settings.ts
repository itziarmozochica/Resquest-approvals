import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickSettingsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickSettings);
  }
}
