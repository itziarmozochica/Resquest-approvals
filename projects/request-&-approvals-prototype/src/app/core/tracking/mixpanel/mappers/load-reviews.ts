import { LoadReviewsEvent } from '../../core/events/load-reviews';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class LoadReviewsMapper implements MixpanelTrackingMapper<LoadReviewsEvent> {
  map(event: LoadReviewsEvent): MixpanelEvent {
    return new MixpanelEvent('load_reviews', mixPlanBuilder(event.data));
  }
}
