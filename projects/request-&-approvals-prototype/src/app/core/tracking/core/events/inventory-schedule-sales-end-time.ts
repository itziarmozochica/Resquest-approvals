import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type InventoryScheduleSalesEndTimeType = 'fixed_date_time' | 'relative_end';

export interface InventoryScheduleSalesEndTimeData {
  type: InventoryScheduleSalesEndTimeType;
}

export class InventoryScheduleSalesEndTimeEvent extends TrackingEvent<InventoryScheduleSalesEndTimeData> {
  constructor(readonly data: InventoryScheduleSalesEndTimeData) {
    super(TrackingEvents.InventoryScheduleSalesEndTime, data);
  }
}
