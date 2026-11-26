import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export type DeleteExportDashboardBuilderDeliveryMethod = 'email' | 'sftp';

export interface DeleteExportDashboardBuilderData {
  delivery_method?: DeleteExportDashboardBuilderDeliveryMethod;
  export_id: string;
  frequency?: string;
}

export class DeleteExportDashboardBuilderEvent extends TrackingEvent<DeleteExportDashboardBuilderData> {
  constructor(readonly data: DeleteExportDashboardBuilderData) {
    super(TrackingEvents.DeleteExportDashboardBuilder, data);
  }
}
