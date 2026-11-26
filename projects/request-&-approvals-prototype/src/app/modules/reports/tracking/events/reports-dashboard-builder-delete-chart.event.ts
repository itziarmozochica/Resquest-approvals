import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsDashboardBuilderDeleteChartData {
  chartId: number;
}

export const reportsDashboardBuilderDeleteChart = defineEvent<ReportsDashboardBuilderDeleteChartData>(
  'reports.dashboardBuilder.chart.delete',
);
