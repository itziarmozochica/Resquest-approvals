import { DashboardBuilderActionSourceET } from '@fz-original/app/core/tracking/core/events/dashboard-builder-action-source';
import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export interface CreateChartDashboardBuilderData {
  source: DashboardBuilderActionSourceET;
}

export class CreateChartDashboardBuilderEvent extends TrackingEvent<CreateChartDashboardBuilderData> {
  constructor(readonly data: CreateChartDashboardBuilderData) {
    super(TrackingEvents.CreateChartDashboardBuilder, data);
  }
}
