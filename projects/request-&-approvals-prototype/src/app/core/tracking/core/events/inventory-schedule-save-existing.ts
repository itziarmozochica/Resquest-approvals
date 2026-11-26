import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryScheduleSaveExistingEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryScheduleSaveExisting);
  }
}
