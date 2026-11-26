import { defineEvent } from '@fz/fz-tracking/src/public-api';

export const Reports360RealTimeDashboard = {
  Attendance: 'real_time_attendance',
  SalesSummary: 'real_time_sales_summary',
} as const;

export type Reports360RealTimeDashboardET = (typeof Reports360RealTimeDashboard)[keyof typeof Reports360RealTimeDashboard];

export interface Reports360RealTimeViewData {
  dashboard: Reports360RealTimeDashboardET;
  planCount: number;
  planCountSent: number;
  time: string;
}

export const reports360RealTimeView = defineEvent<Reports360RealTimeViewData>('reports.analytics_360.real_time.view');
