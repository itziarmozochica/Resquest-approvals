import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickCalendarTimeSlotData {
  plan_id: number;
  place_id: number;
  time_slot_id: number;
}

export class ClickCalendarTimeSlotEvent extends TrackingEvent<ClickCalendarTimeSlotData> {
  constructor(readonly data: ClickCalendarTimeSlotData) {
    super(TrackingEvents.ClickCalendarTimeSlot, data);
  }
}
