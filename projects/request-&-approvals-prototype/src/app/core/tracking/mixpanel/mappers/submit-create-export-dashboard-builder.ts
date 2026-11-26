import { SubmitCreateExportDashboardBuilderEvent } from '@fz-original/app/core/tracking/core/events/submit-create-export-dashboard-builder';
import { MixpanelEvent } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-mapper';

export class SubmitCreateExportDashboardBuilderMapper implements MixpanelTrackingMapper<SubmitCreateExportDashboardBuilderEvent> {
  map(event: SubmitCreateExportDashboardBuilderEvent): MixpanelEvent {
    return new MixpanelEvent('submit_create_export_dashboard_builder', event.data);
  }
}
