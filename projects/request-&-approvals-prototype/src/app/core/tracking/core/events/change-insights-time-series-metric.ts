import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ChangeInsightsTimeSeriesMetricData {
  new_metric: string;
  plan_id: number;
  previous_metric: string;
}

export class ChangeInsightsTimeSeriesMetricEvent extends TrackingEvent<ChangeInsightsTimeSeriesMetricData> {
  constructor(readonly data: ChangeInsightsTimeSeriesMetricData) {
    super(TrackingEvents.ChangeInsightsTimeSeriesMetric, data);
  }
}
