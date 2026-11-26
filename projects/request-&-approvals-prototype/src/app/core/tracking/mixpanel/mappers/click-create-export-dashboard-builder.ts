import { ClickCreateExportDashboardBuilderEvent } from '../../core/events/click-create-export-dashboard-builder';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickCreateExportDashboardBuilderMapper implements MixpanelTrackingMapper<ClickCreateExportDashboardBuilderEvent> {
  map(event: ClickCreateExportDashboardBuilderEvent): MixpanelEvent {
    return new MixpanelEvent('click_create_export_dashboard_builder', event.data);
  }
}
