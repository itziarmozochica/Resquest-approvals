import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CancelExtendTimeSlotData {
  plan_id: number;
}

export class CancelExtendTimeSlotEvent extends TrackingEvent<CancelExtendTimeSlotData> {
  constructor(readonly data: CancelExtendTimeSlotData) {
    super(TrackingEvents.CancelExtendTimeSlot, data);
  }
}
