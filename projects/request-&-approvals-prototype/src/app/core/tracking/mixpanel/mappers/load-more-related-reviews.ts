import { LoadMoreRelatedReviewsEvent } from '../../core/events/load-more-related-reviews';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadMoreRelatedReviewsMapper implements MixpanelTrackingMapper<LoadMoreRelatedReviewsEvent> {
  map(event: LoadMoreRelatedReviewsEvent): MixpanelEvent {
    return new MixpanelEvent('load_more_related_reviews', event.data);
  }
}
