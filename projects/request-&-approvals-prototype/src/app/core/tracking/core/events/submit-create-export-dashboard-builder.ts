import { DashboardBuilderActionSourceET } from '@fz-original/app/core/tracking/core/events/dashboard-builder-action-source';
import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export type SubmitCreateExportDashboardBuilderDeliveryMethod = 'email' | 'sftp';
export type SubmitCreateExportDashboardBuilderFileType = 'csv' | 'png';
export type SubmitCreateExportDashboardBuilderFrequency = 'daily' | 'hourly' | 'monthly' | 'one_time' | 'weekly';

export interface SubmitCreateExportDashboardBuilderData {
  chart_id: number | null;
  delivery_method: SubmitCreateExportDashboardBuilderDeliveryMethod;
  file_type: SubmitCreateExportDashboardBuilderFileType;
  frequency: SubmitCreateExportDashboardBuilderFrequency;
  is_new_channel: boolean;
  source: DashboardBuilderActionSourceET;
}

export class SubmitCreateExportDashboardBuilderEvent extends TrackingEvent<SubmitCreateExportDashboardBuilderData> {
  constructor(readonly data: SubmitCreateExportDashboardBuilderData) {
    super(TrackingEvents.SubmitCreateExportDashboardBuilder, data);
  }
}
