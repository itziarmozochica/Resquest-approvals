import { ClickConfirmDeleteSessionRuleEvent } from '../../core/events/click-confirm-delete-session-rule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickConfirmDeleteSessionRuleMapper implements MixpanelTrackingMapper<ClickConfirmDeleteSessionRuleEvent> {
  map(event: ClickConfirmDeleteSessionRuleEvent): MixpanelEvent {
    return new MixpanelEvent('click_confirm_delete_session_rule', event.data);
  }
}
