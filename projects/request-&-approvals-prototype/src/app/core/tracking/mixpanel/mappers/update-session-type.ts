import { UpdateSessionTypeEvent } from '../../core/events/update-session-type';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdateSessionTypeMapper implements MixpanelTrackingMapper<UpdateSessionTypeEvent> {
  map(event: UpdateSessionTypeEvent): MixpanelEvent {
    return new MixpanelEvent('update_session_type', event.data);
  }
}
