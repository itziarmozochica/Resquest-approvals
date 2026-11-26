import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateSessionTypeGroupData {
  plan_id: number;
  session_type_group_id: number;
  previous: {
    default_capacity?: number | null;
  };
  new: {
    default_capacity?: number | null;
  };
}

export class UpdateSessionTypeGroupEvent extends TrackingEvent<UpdateSessionTypeGroupData> {
  constructor(readonly data: UpdateSessionTypeGroupData) {
    super(TrackingEvents.UpdateSessionTypeGroup, data);
  }
}
