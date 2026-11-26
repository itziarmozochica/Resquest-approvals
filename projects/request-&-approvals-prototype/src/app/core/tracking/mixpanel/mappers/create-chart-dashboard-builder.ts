import { CreateChartDashboardBuilderEvent } from '../../core/events/create-chart-dashboard-builder';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateChartDashboardBuilderMapper implements MixpanelTrackingMapper<CreateChartDashboardBuilderEvent> {
  map(event: CreateChartDashboardBuilderEvent): MixpanelEvent {
    return new MixpanelEvent('create_chart_dashboard_builder', event.data);
  }
}
