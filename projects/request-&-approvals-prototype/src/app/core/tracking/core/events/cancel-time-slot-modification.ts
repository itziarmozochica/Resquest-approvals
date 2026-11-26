import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CancelTimeSlotModificationData {
  had_unsaved_changes: boolean;
  place_id: number;
  plan_id: number;
  time_slot_id: number;
}

export class CancelTimeSlotModificationEvent extends TrackingEvent<CancelTimeSlotModificationData> {
  constructor(readonly data: CancelTimeSlotModificationData) {
    super(TrackingEvents.CancelTimeSlotModification, data);
  }
}
