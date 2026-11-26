import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadMoreRelatedReviewsData {
  plan_id: number;
  insight_id: number | string;
  offset: number;
  page_size: number;
  loaded_count: number;
  total: number;
}

export class LoadMoreRelatedReviewsEvent extends TrackingEvent<LoadMoreRelatedReviewsData> {
  constructor(readonly data: LoadMoreRelatedReviewsData) {
    super(TrackingEvents.LoadMoreRelatedReviews, data);
  }
}
