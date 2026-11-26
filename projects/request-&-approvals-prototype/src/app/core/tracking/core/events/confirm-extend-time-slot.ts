import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmExtendTimeSlotData {
  selected_dates_count: number;
  plan_id: number;
}

export class ConfirmExtendTimeSlotEvent extends TrackingEvent<ConfirmExtendTimeSlotData> {
  constructor(readonly data: ConfirmExtendTimeSlotData) {
    super(TrackingEvents.ConfirmExtendTimeSlot, data);
  }
}
