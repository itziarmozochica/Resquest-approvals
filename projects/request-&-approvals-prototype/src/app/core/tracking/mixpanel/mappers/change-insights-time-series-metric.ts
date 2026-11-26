import { ChangeInsightsTimeSeriesMetricEvent } from '../../core/events/change-insights-time-series-metric';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ChangeInsightsTimeSeriesMetricMapper implements MixpanelTrackingMapper<ChangeInsightsTimeSeriesMetricEvent> {
  map(event: ChangeInsightsTimeSeriesMetricEvent): MixpanelEvent {
    return new MixpanelEvent('change_insights_time_series_metric', event.data);
  }
}
