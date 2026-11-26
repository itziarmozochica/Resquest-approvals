import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type ReportsDashboardBuilderTab = 'charts' | 'dashboards' | 'deliveryMethods' | 'exports';

export interface ReportsDashboardBuilderTabSwitchData {
  fromTab: ReportsDashboardBuilderTab;
  tab: ReportsDashboardBuilderTab;
}

export const reportsDashboardBuilderTabSwitch = defineEvent<ReportsDashboardBuilderTabSwitchData>('reports.dashboardBuilder.tab.switch');
