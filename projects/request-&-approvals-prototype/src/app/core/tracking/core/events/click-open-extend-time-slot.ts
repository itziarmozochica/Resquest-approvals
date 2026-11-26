import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickOpenExtendTimeSlotData {
  plan_id: number;
}

export class ClickOpenExtendTimeSlotEvent extends TrackingEvent<ClickOpenExtendTimeSlotData> {
  constructor(readonly data: ClickOpenExtendTimeSlotData) {
    super(TrackingEvents.ClickOpenExtendTimeSlot, data);
  }
}
