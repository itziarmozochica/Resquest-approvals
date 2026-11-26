import { ClickReviewsTabEvent } from '../../core/events/click-reviews-tab';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickReviewsTabMapper implements MixpanelTrackingMapper<ClickReviewsTabEvent> {
  map(event: ClickReviewsTabEvent): MixpanelEvent {
    return new MixpanelEvent('click_reviews_tab', event.data);
  }
}
