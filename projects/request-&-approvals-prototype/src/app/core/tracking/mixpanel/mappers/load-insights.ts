import { LoadInsightsEvent } from '../../core/events/load-insights';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadInsightsMapper implements MixpanelTrackingMapper<LoadInsightsEvent> {
  map(event: LoadInsightsEvent): MixpanelEvent {
    return new MixpanelEvent('load_insights', event.data);
  }
}
