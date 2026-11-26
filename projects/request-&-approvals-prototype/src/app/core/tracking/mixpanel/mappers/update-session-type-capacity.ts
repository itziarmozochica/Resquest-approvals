import { UpdateSessionTypeCapacityEvent } from '../../core/events/update-session-type-capacity';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdateSessionTypeCapacityMapper implements MixpanelTrackingMapper<UpdateSessionTypeCapacityEvent> {
  map(event: UpdateSessionTypeCapacityEvent): MixpanelEvent {
    return new MixpanelEvent('update_session_type_capacity', event.data);
  }
}
