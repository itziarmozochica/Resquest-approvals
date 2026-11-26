import { CreateDashboardDashboardBuilderEvent } from '../../core/events/create-dashboard-dashboard-builder';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateDashboardDashboardBuilderMapper implements MixpanelTrackingMapper<CreateDashboardDashboardBuilderEvent> {
  map(event: CreateDashboardDashboardBuilderEvent): MixpanelEvent {
    return new MixpanelEvent('create_dashboard_dashboard_builder', event.data);
  }
}
