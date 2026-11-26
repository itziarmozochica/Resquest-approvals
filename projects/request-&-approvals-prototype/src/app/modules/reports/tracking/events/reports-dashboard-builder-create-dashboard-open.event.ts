import { DashboardBuilderActionSourceET } from '@fz-original/app/modules/reports/shared/models/dashboard-builder-action-source';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsDashboardBuilderCreateDashboardOpenData {
  source: DashboardBuilderActionSourceET;
}

export const reportsDashboardBuilderCreateDashboardOpen = defineEvent<ReportsDashboardBuilderCreateDashboardOpenData>(
  'reports.dashboardBuilder.createDashboard.open',
);
