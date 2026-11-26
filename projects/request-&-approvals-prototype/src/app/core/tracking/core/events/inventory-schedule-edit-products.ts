import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InventoryScheduleEditProductsData {
  selects_ticket_types?: boolean;
  unselects_ticket_types?: boolean;
}

export class InventoryScheduleEditProductsEvent extends TrackingEvent<InventoryScheduleEditProductsData> {
  constructor(readonly data: InventoryScheduleEditProductsData = {}) {
    super(TrackingEvents.InventoryScheduleEditProducts, data);
  }
}
