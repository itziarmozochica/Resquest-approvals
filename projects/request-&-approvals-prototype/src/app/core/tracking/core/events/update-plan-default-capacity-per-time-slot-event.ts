import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdatePlanDefaultCapacityPerTimeSlotData {
  plan_id: number;
  previous_capacity_per_time_slot: number | null;
  new_capacity_per_time_slot: number | null;
}

export class UpdatePlanDefaultCapacityPerTimeSlotEvent extends TrackingEvent<UpdatePlanDefaultCapacityPerTimeSlotData> {
  constructor(readonly data: UpdatePlanDefaultCapacityPerTimeSlotData) {
    super(TrackingEvents.UpdatePlanDefaultCapacityPerTimeSlot, data);
  }
}
