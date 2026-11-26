import { DashboardBuilderActionSourceET } from '@fz-original/app/modules/reports/shared/models/dashboard-builder-action-source';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsDashboardBuilderExportPanelCancelData {
  chartId?: number;
  source: DashboardBuilderActionSourceET;
}

export const reportsDashboardBuilderExportPanelCancel = defineEvent<ReportsDashboardBuilderExportPanelCancelData>(
  'reports.dashboardBuilder.exportPanel.cancel',
);
