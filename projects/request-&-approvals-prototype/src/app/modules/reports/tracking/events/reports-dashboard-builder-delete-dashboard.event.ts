import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsDashboardBuilderDeleteDashboardData {
  dashboardId: number;
}

export const reportsDashboardBuilderDeleteDashboard = defineEvent<ReportsDashboardBuilderDeleteDashboardData>(
  'reports.dashboardBuilder.dashboard.delete',
);
