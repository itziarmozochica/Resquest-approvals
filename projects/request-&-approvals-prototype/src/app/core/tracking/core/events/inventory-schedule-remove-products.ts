import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryScheduleRemoveProductsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryScheduleRemoveProducts);
  }
}
