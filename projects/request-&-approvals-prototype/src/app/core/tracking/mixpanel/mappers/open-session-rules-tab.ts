import { OpenSessionRulesTabEvent } from '../../core/events/open-session-rules-tab';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenSessionRulesTabMapper implements MixpanelTrackingMapper<OpenSessionRulesTabEvent> {
  map(event: OpenSessionRulesTabEvent): MixpanelEvent {
    return new MixpanelEvent('open_sessions_rules', event.data);
  }
}
