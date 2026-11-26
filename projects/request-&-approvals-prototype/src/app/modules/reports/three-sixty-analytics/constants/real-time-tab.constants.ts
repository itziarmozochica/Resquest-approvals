import { RealTimeDashboardSlug, RealTimeDashboardSlugET } from '@fz-original/app/shared/insights-embed/models/real-time-dashboard-slug';

import { Reports360RealTimeDashboard, Reports360RealTimeDashboardET } from '../../tracking/events/reports-360-real-time-view.event';

export interface RealTimeTabDescriptor {
  /**
   * Human text with spaces on purpose, against the repo's snake_case rule for categorical values: the
   * other values of this Mixpanel property are backend names ("Sales Summary", "Sales by breakdown")
   * with tens of thousands of loads behind them, and a snake_case outlier would show three formats in
   * one breakdown. Do not "fix" this.
   */
  reportName: string;
  slug: RealTimeDashboardSlugET;
  trackingDashboard: Reports360RealTimeDashboardET;
}

export const REAL_TIME_TAB_BY_SLUG: Readonly<Partial<Record<RealTimeDashboardSlugET, RealTimeTabDescriptor>>> = {
  [RealTimeDashboardSlug.Attendance]: {
    reportName: 'Real Time Attendance',
    slug: RealTimeDashboardSlug.Attendance,
    trackingDashboard: Reports360RealTimeDashboard.Attendance,
  },
  [RealTimeDashboardSlug.BigLaunches]: {
    reportName: 'Real Time Sales Summary',
    slug: RealTimeDashboardSlug.BigLaunches,
    trackingDashboard: Reports360RealTimeDashboard.SalesSummary,
  },
};

export const REAL_TIME_TAB_DESCRIPTORS: ReadonlyArray<RealTimeTabDescriptor> = Object.values(REAL_TIME_TAB_BY_SLUG).filter(
  (descriptor): descriptor is RealTimeTabDescriptor => descriptor !== undefined,
);
