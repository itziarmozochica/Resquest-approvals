import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsDashboardBuilderOwnedByMeChangeData {
  checked: boolean;
}

export const reportsDashboardBuilderOwnedByMeChange = defineEvent<ReportsDashboardBuilderOwnedByMeChangeData>(
  'reports.dashboardBuilder.ownedByMe.change',
);
