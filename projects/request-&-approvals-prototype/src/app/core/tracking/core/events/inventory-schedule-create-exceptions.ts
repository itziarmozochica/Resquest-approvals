import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryScheduleCreateExceptionsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryScheduleCreateExceptions);
  }
}
