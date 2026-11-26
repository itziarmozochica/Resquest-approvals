import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsDashboardBuilderClickData {
  time: string;
}

export const reportsDashboardBuilderClick = defineEvent<ReportsDashboardBuilderClickData>('reports.dashboardBuilder.click');
