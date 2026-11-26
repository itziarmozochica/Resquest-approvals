export const AnalyticsRoutes = {
  AllNotifications: 'notifications',
  DashboardBuilder: 'dashboard-builder',
  DashboardBuilderChartDetails: 'dashboard-builder/chart/:id',
  DashboardBuilderCreateChart: 'dashboard-builder/chart/create',
  DashboardBuilderDashboardDetails: 'dashboard-builder/dashboard/:id',
  FzAssistant: 'fz-assistant',
  GlobalAnalytics: 'global',
  RealTime: 'real-time',
  RealTimeAttendance: 'attendance',
  RealTimeBigLaunches: 'big-launches',
  ScheduledReportExport: 'scheduled-report-export',
  ThreeSixtyAnalytics: 'three-sixty-analytics',
  ThreeSixtyAnalyticsExternal: 'three-sixty-analytics-external',
} as const;

export type AnalyticsRoutesET = (typeof AnalyticsRoutes)[keyof typeof AnalyticsRoutes];
