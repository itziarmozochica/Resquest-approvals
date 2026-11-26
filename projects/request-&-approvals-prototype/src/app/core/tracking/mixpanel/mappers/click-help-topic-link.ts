import { ClickHelpTopicLinkEvent } from '../../core/events/click-help-topic-link';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickHelpTopicLinkMapper implements MixpanelTrackingMapper<ClickHelpTopicLinkEvent> {
  map(event: ClickHelpTopicLinkEvent): MixpanelEvent {
    return new MixpanelEvent('click_help_topic_link', event.data);
  }
}
