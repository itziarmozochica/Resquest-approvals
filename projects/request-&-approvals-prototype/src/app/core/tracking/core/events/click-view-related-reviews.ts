import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { InsightsCarouselTypeET } from './navigate-insights-carousel';

export interface ClickViewRelatedReviewsData {
  insight_id: number | string;
  insight_title: string;
  insight_type: InsightsCarouselTypeET;
  plan_id: number;
  total_feedbacks: number;
}

export class ClickViewRelatedReviewsEvent extends TrackingEvent<ClickViewRelatedReviewsData> {
  constructor(readonly data: ClickViewRelatedReviewsData) {
    super(TrackingEvents.ClickViewRelatedReviews, data);
  }
}
