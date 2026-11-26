import { UpdateSessionRuleEvent } from '../../core/events/update-session-rule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdateSessionRuleMapper implements MixpanelTrackingMapper<UpdateSessionRuleEvent> {
  map(event: UpdateSessionRuleEvent): MixpanelEvent {
    return new MixpanelEvent('update_session_rule', event.data);
  }
}
