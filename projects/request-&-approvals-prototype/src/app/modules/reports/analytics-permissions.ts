import { Permissions } from '../../shared/services/user/permissions';

export const ANALYTICS_HOME_PERMISSIONS: readonly Permissions[] = [
  Permissions.CAN_VIEW_REPORTS,
  Permissions.CAN_VIEW_GLOBAL_REPORTS,
  Permissions.CAN_MANAGE_DASHBOARD_BUILDER,
];
