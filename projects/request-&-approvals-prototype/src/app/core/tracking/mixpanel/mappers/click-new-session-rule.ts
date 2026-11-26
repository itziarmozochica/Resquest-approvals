import { ClickNewSessionRuleEvent } from '../../core/events/click-new-session-rule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickNewSessionRuleMapper implements MixpanelTrackingMapper<ClickNewSessionRuleEvent> {
  map(event: ClickNewSessionRuleEvent): MixpanelEvent {
    return new MixpanelEvent('click_new_session_rule', event.data);
  }
}
