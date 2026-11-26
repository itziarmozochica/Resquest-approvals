import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickInsightsSummaryPlanData {
  city_id: number;
  has_session_dates: boolean;
  plan_id: number;
  plan_name: string;
  session_end_date: string | null;
  session_start_date: string | null;
}

export class ClickInsightsSummaryPlanEvent extends TrackingEvent<ClickInsightsSummaryPlanData> {
  constructor(readonly data: ClickInsightsSummaryPlanData) {
    super(TrackingEvents.ClickInsightsSummaryPlan, data);
  }
}
