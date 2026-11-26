import { ListPlanItem } from '../../../../modules/attendees/list-attendees/models/list-plan-item.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface LoadEventData {
  question_type: string;
  city_id: number;
  plan: ListPlanItem | null;
  time: string;
  starts_at_from: string;
  starts_at_to: string;
  order_by?: string;
  order_by_direction?: string;
  has_results?: boolean;
  default_filter: boolean;
  has_comment?: boolean;
}

export class LoadReviewsEvent extends TrackingEvent<LoadEventData> {
  constructor(readonly data: LoadEventData) {
    super(TrackingEvents.LoadReviews, data);
  }
}
