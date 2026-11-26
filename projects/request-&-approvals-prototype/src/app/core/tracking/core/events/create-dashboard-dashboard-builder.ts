import { DashboardBuilderActionSourceET } from '@fz-original/app/core/tracking/core/events/dashboard-builder-action-source';
import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export interface CreateDashboardDashboardBuilderData {
  source: DashboardBuilderActionSourceET;
}

export class CreateDashboardDashboardBuilderEvent extends TrackingEvent<CreateDashboardDashboardBuilderData> {
  constructor(readonly data: CreateDashboardDashboardBuilderData) {
    super(TrackingEvents.CreateDashboardDashboardBuilder, data);
  }
}
