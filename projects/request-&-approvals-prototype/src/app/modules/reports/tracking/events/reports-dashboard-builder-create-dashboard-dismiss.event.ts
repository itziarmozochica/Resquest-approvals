import { DashboardBuilderActionSourceET } from '@fz-original/app/modules/reports/shared/models/dashboard-builder-action-source';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsDashboardBuilderCreateDashboardDismissData {
  source: DashboardBuilderActionSourceET;
}

export const reportsDashboardBuilderCreateDashboardDismiss = defineEvent<ReportsDashboardBuilderCreateDashboardDismissData>(
  'reports.dashboardBuilder.createDashboard.dismiss',
);
