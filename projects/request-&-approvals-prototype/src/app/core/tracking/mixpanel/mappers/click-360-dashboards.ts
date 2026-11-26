import { Click360DashboardsEvent } from '../../core/events/click-360-dashboards';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class Click360DashboardsMapper implements MixpanelTrackingMapper<Click360DashboardsEvent> {
  map(event: Click360DashboardsEvent): MixpanelEvent {
    return new MixpanelEvent('click_360_dashboards', event.data);
  }
}
