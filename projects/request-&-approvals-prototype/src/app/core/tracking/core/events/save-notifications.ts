import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class SaveNotificationsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.SaveNotifications);
  }
}
