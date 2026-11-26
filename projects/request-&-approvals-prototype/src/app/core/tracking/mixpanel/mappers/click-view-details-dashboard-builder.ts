import { ClickViewDetailsDashboardBuilderEvent } from '../../core/events/click-view-details-dashboard-builder';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickViewDetailsDashboardBuilderMapper implements MixpanelTrackingMapper<ClickViewDetailsDashboardBuilderEvent> {
  map(event: ClickViewDetailsDashboardBuilderEvent): MixpanelEvent {
    return new MixpanelEvent('click_view_details_dashboard_builder', event.data);
  }
}
