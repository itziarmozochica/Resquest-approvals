import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadTimeSlotModificationData {
  place_id: number;
  plan_id: number;
  time_slot_id: number;
}

export class LoadTimeSlotModificationEvent extends TrackingEvent<LoadTimeSlotModificationData> {
  constructor(readonly data: LoadTimeSlotModificationData) {
    super(TrackingEvents.LoadTimeSlotModification, data);
  }
}
