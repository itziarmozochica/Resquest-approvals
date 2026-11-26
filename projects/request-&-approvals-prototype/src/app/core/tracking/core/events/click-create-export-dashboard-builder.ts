import { DashboardBuilderActionSourceET } from '@fz-original/app/core/tracking/core/events/dashboard-builder-action-source';
import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export interface ClickCreateExportDashboardBuilderData {
  item_id?: number;
  source: DashboardBuilderActionSourceET;
}

export class ClickCreateExportDashboardBuilderEvent extends TrackingEvent<ClickCreateExportDashboardBuilderData> {
  constructor(readonly data: ClickCreateExportDashboardBuilderData) {
    super(TrackingEvents.ClickCreateExportDashboardBuilder, data);
  }
}
