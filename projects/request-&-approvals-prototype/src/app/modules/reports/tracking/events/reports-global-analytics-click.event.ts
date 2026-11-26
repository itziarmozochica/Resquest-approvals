import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsGlobalAnalyticsClickData {
  time: string;
}

export const reportsGlobalAnalyticsClick = defineEvent<ReportsGlobalAnalyticsClickData>('reports.globalAnalytics.click');
