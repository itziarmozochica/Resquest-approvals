import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickReportReviewData {
  plan_id: number;
  review_id: number;
  rating: number;
  review_reasoning: string;
}

export class ClickReportReviewEvent extends TrackingEvent<ClickReportReviewData> {
  constructor(readonly data: ClickReportReviewData) {
    super(TrackingEvents.ClickReportReview, data);
  }
}
