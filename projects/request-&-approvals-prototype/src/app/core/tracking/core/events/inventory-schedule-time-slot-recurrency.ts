import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type InventoryScheduleTimeSlotRecurrencyType = 'single_timeslot' | 'recurring';

export interface InventoryScheduleTimeSlotRecurrencyData {
  type: InventoryScheduleTimeSlotRecurrencyType;
}

export class InventoryScheduleTimeSlotRecurrencyEvent extends TrackingEvent<InventoryScheduleTimeSlotRecurrencyData> {
  constructor(readonly data: InventoryScheduleTimeSlotRecurrencyData) {
    super(TrackingEvents.InventoryScheduleTimeSlotRecurrency, data);
  }
}
