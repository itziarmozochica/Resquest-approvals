import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadInsightsData {
  city_id: number | null;
  date_range_days: number | null;
  has_empty_state: boolean;
  has_error: boolean;
  insights_count: number | null;
  plan_id: number;
  time: string;
  total_reviews: number | null;
}

export class LoadInsightsEvent extends TrackingEvent<LoadInsightsData> {
  constructor(readonly data: LoadInsightsData) {
    super(TrackingEvents.LoadInsights, data);
  }
}
