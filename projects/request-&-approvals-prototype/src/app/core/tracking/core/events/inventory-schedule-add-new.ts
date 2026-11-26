import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryScheduleAddNewEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryScheduleAddNew);
  }
}
