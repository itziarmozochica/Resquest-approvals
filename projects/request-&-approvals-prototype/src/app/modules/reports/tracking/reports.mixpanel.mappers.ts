import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { reports360RealTimeView } from './events/reports-360-real-time-view.event';
import { reportsDashboardBuilderClick } from './events/reports-dashboard-builder-click.event';
import { reportsDashboardBuilderCreateDashboardDismiss } from './events/reports-dashboard-builder-create-dashboard-dismiss.event';
import { reportsDashboardBuilderCreateDashboardOpen } from './events/reports-dashboard-builder-create-dashboard-open.event';
import { reportsDashboardBuilderDeleteChart } from './events/reports-dashboard-builder-delete-chart.event';
import { reportsDashboardBuilderDeleteDashboard } from './events/reports-dashboard-builder-delete-dashboard.event';
import { reportsDashboardBuilderExportPanelCancel } from './events/reports-dashboard-builder-export-panel-cancel.event';
import { reportsDashboardBuilderGuidedStepsDismiss } from './events/reports-dashboard-builder-guided-steps-dismiss.event';
import { reportsDashboardBuilderGuidedStepsVideoDemoClick } from './events/reports-dashboard-builder-guided-steps-video-demo-click.event';
import { reportsDashboardBuilderOwnedByMeChange } from './events/reports-dashboard-builder-owned-by-me-change.event';
import { reportsDashboardBuilderTabSwitch } from './events/reports-dashboard-builder-tab-switch.event';
import { reportsExternalChannelsClick } from './events/reports-external-channels-click.event';
import { reportsGlobalAnalyticsClick } from './events/reports-global-analytics-click.event';
import { reportsGlobalAnalyticsOrganizationsSelect } from './events/reports-global-analytics-organizations-select.event';
import { reportsRealTimeAttendanceView } from './events/reports-real-time-attendance-view.event';
import { reportsRealTimeBigLaunchesView } from './events/reports-real-time-big-launches-view.event';

export const reportsMixpanelMappers = mixpanelMapper([
  {
    event: reports360RealTimeView,
    name: 'view_360_real_time_report',
    properties: ({ planCount, planCountSent, ...rest }) => ({ plan_count: planCount, plan_count_sent: planCountSent, ...rest }),
  },
  {
    event: reportsDashboardBuilderClick,
    name: 'click_dashboard_builder',
    properties: null,
  },
  {
    event: reportsDashboardBuilderCreateDashboardDismiss,
    name: 'dismiss_create_dashboard_dashboard_builder',
    properties: null,
  },
  {
    event: reportsDashboardBuilderCreateDashboardOpen,
    name: 'click_create_dashboard_dashboard_builder',
    properties: null,
  },
  {
    event: reportsDashboardBuilderDeleteChart,
    name: 'delete_chart_dashboard_builder',
    properties: ({ chartId }) => ({
      chart_id: chartId,
    }),
  },
  {
    event: reportsDashboardBuilderDeleteDashboard,
    name: 'delete_dashboard_dashboard_builder',
    properties: ({ dashboardId }) => ({
      dashboard_id: dashboardId,
    }),
  },
  {
    event: reportsDashboardBuilderExportPanelCancel,
    name: 'cancel_export_panel_dashboard_builder',
    properties: ({ chartId, ...rest }) => ({
      ...(chartId !== undefined ? { chart_id: chartId } : {}),
      ...rest,
    }),
  },
  {
    event: reportsDashboardBuilderGuidedStepsDismiss,
    name: 'dismiss_guided_steps_dashboard_builder',
    properties: null,
  },
  {
    event: reportsDashboardBuilderGuidedStepsVideoDemoClick,
    name: 'click_video_demo_dashboard_builder',
    properties: null,
  },
  {
    event: reportsDashboardBuilderOwnedByMeChange,
    name: 'toggle_owned_by_me_dashboard_builder',
    properties: null,
  },
  {
    event: reportsDashboardBuilderTabSwitch,
    name: 'switch_tab_dashboard_builder',
    properties: ({ fromTab, ...rest }) => ({
      from_tab: fromTab,
      ...rest,
    }),
  },
  {
    event: reportsExternalChannelsClick,
    name: 'click_external_channels',
    properties: null,
  },
  {
    event: reportsGlobalAnalyticsClick,
    name: 'click_global_analytics',
    properties: null,
  },
  {
    event: reportsGlobalAnalyticsOrganizationsSelect,
    name: 'select_option_typeahead',
    properties: null,
  },
  {
    event: reportsRealTimeAttendanceView,
    name: 'view_real_time_attendance_report',
    properties: ({ planCount, ...rest }) => ({ plan_count: planCount, ...rest }),
  },
  {
    event: reportsRealTimeBigLaunchesView,
    name: 'view_real_time_big_launches_report',
    properties: ({ planCount, ...rest }) => ({ plan_count: planCount, ...rest }),
  },
]);
