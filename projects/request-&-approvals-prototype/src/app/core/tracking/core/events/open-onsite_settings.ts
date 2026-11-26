import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class OpenOnsiteSettingsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.OpenOnsiteSettings);
  }
}
