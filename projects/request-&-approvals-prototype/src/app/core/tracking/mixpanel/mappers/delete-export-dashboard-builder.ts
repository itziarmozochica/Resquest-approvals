import { DeleteExportDashboardBuilderEvent } from '@fz-original/app/core/tracking/core/events/delete-export-dashboard-builder';
import { MixpanelEvent } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-mapper';

export class DeleteExportDashboardBuilderMapper implements MixpanelTrackingMapper<DeleteExportDashboardBuilderEvent> {
  map(event: DeleteExportDashboardBuilderEvent): MixpanelEvent {
    return new MixpanelEvent('delete_export_dashboard_builder', event.data);
  }
}
