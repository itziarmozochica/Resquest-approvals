import { ClickBackToInsightsSummaryEvent } from '../../core/events/click-back-to-insights-summary';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickBackToInsightsSummaryMapper implements MixpanelTrackingMapper<ClickBackToInsightsSummaryEvent> {
  map(event: ClickBackToInsightsSummaryEvent): MixpanelEvent {
    return new MixpanelEvent('click_back_to_insights_summary', event.data);
  }
}
