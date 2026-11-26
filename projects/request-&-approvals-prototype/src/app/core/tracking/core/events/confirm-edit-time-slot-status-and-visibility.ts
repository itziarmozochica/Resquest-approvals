import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmEditTimeSlotStatusAndVisibilityData {
  plan_id: number;
  time_slot_id: number;
  previous: {
    sold_out?: boolean;
    is_hidden?: boolean;
  };
  new: {
    sold_out?: boolean;
    is_hidden?: boolean;
  };
}

export class ConfirmEditTimeSlotStatusAndVisibilityEvent extends TrackingEvent<ConfirmEditTimeSlotStatusAndVisibilityData> {
  constructor(readonly data: ConfirmEditTimeSlotStatusAndVisibilityData) {
    super(TrackingEvents.ConfirmEditTimeSlotStatusAndVisibility, data);
  }
}
