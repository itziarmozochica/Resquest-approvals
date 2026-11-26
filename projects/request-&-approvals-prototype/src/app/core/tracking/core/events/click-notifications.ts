import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickNotificationsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickNotifications);
  }
}
