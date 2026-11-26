import { UpdateSessionTypeGroupEvent } from '../../core/events/update-session-type-group';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdateSessionTypeGroupMapper implements MixpanelTrackingMapper<UpdateSessionTypeGroupEvent> {
  map(event: UpdateSessionTypeGroupEvent): MixpanelEvent {
    return new MixpanelEvent('update_session_type_group', event.data);
  }
}
