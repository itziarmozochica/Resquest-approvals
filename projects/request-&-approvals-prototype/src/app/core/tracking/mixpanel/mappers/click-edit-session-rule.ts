import { ClickEditSessionRuleEvent } from '../../core/events/click-edit-session-rule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickEditSessionRuleMapper implements MixpanelTrackingMapper<ClickEditSessionRuleEvent> {
  map(event: ClickEditSessionRuleEvent): MixpanelEvent {
    return new MixpanelEvent('click_edit_session_rule', event.data);
  }
}
