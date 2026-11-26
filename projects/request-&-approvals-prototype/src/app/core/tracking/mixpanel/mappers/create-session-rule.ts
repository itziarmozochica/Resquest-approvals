import { CreateSessionRuleEvent } from '../../core/events/create-session-rule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateSessionRuleMapper implements MixpanelTrackingMapper<CreateSessionRuleEvent> {
  map(event: CreateSessionRuleEvent): MixpanelEvent {
    return new MixpanelEvent('create_session_rule', event.data);
  }
}
