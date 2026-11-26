import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateSessionTypeCapacityData {
  plan_id: number;
  session_type_id: number;
  previous_capacity?: number;
  new_capacity?: number;
}

export class UpdateSessionTypeCapacityEvent extends TrackingEvent<UpdateSessionTypeCapacityData> {
  constructor(readonly data: UpdateSessionTypeCapacityData) {
    super(TrackingEvents.UpdateSessionTypeCapacity, data);
  }
}
