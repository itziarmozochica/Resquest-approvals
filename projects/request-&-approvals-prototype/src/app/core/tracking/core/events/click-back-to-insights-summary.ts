import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export const BackToSummarySource = {
  detail: 'detail',
} as const;

export type BackToSummarySourceET = (typeof BackToSummarySource)[keyof typeof BackToSummarySource];

export interface ClickBackToInsightsSummaryData {
  from_state: BackToSummarySourceET;
  plan_id: number;
}

export class ClickBackToInsightsSummaryEvent extends TrackingEvent<ClickBackToInsightsSummaryData> {
  constructor(readonly data: ClickBackToInsightsSummaryData) {
    super(TrackingEvents.ClickBackToInsightsSummary, data);
  }
}
