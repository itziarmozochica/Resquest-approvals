import { ClickViewRelatedReviewsEvent } from '../../core/events/click-view-related-reviews';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickViewRelatedReviewsMapper implements MixpanelTrackingMapper<ClickViewRelatedReviewsEvent> {
  map(event: ClickViewRelatedReviewsEvent): MixpanelEvent {
    return new MixpanelEvent('click_view_related_reviews', event.data);
  }
}
