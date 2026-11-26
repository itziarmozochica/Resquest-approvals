import { ClickInsightsSummaryPlanEvent } from '../../core/events/click-insights-summary-plan';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickInsightsSummaryPlanMapper implements MixpanelTrackingMapper<ClickInsightsSummaryPlanEvent> {
  map(event: ClickInsightsSummaryPlanEvent): MixpanelEvent {
    return new MixpanelEvent('click_insights_summary_plan', event.data);
  }
}
