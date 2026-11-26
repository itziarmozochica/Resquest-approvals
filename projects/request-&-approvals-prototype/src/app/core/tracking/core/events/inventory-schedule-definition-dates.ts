import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type InventoryScheduleDefinitionDatesType = 'recurrent_dates' | 'single_dates';

export interface InventoryScheduleDefinitionDatesData {
  type: InventoryScheduleDefinitionDatesType;
}

export class InventoryScheduleDefinitionDatesEvent extends TrackingEvent<InventoryScheduleDefinitionDatesData> {
  constructor(readonly data: InventoryScheduleDefinitionDatesData) {
    super(TrackingEvents.InventoryScheduleDefinitionDates, data);
  }
}
