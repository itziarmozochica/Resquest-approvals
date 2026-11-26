import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryScheduleSaveNewEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryScheduleSaveNew);
  }
}
