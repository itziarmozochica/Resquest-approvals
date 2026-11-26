import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export const ReviewsTab = {
  allReviews: 'all_reviews',
  insights: 'insights',
  insightsMetricCard: 'insights_metric_card',
} as const;

export type ReviewsTabET = (typeof ReviewsTab)[keyof typeof ReviewsTab];

export interface ClickReviewsTabData {
  source: ReviewsTabET;
  target: ReviewsTabET;
}

export class ClickReviewsTabEvent extends TrackingEvent<ClickReviewsTabData> {
  constructor(readonly data: ClickReviewsTabData) {
    super(TrackingEvents.ClickReviewsTab, data);
  }
}
