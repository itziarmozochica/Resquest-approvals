import { AllowedNumTickets } from '../../../../shared/services/sessions/session-type.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateSessionTypeData {
  plan_id: number;
  session_type_id: number;
  previous: {
    label?: string;
    allowed_num_tickets?: AllowedNumTickets | null;
    instructions?: string | null;
    details?: string;
    is_add_on?: boolean;
    use_for_availability?: boolean;
    product_type?: string | null;
  };
  new: {
    label?: string;
    allowed_num_tickets?: AllowedNumTickets | null;
    instructions?: string | null;
    details?: string;
    is_add_on?: boolean;
    use_for_availability?: boolean;
    product_type?: string | null;
  };
}

export class UpdateSessionTypeEvent extends TrackingEvent<UpdateSessionTypeData> {
  constructor(readonly data: UpdateSessionTypeData) {
    super(TrackingEvents.UpdateSessionType, data);
  }
}
