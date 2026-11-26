import { NavigateInsightsCarouselEvent } from '../../core/events/navigate-insights-carousel';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class NavigateInsightsCarouselMapper implements MixpanelTrackingMapper<NavigateInsightsCarouselEvent> {
  map(event: NavigateInsightsCarouselEvent): MixpanelEvent {
    return new MixpanelEvent('navigate_insights_carousel', event.data);
  }
}
