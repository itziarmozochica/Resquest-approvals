import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type InventoryScheduleSalesStartTimeType = 'fixed_date_time' | 'relative_start' | 'since_creation';

export interface InventoryScheduleSalesStartTimeData {
  type: InventoryScheduleSalesStartTimeType;
}

export class InventoryScheduleSalesStartTimeEvent extends TrackingEvent<InventoryScheduleSalesStartTimeData> {
  constructor(readonly data: InventoryScheduleSalesStartTimeData) {
    super(TrackingEvents.InventoryScheduleSalesStartTime, data);
  }
}
