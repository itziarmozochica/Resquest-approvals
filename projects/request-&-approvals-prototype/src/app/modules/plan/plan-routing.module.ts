import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PlanDashboardComponent } from '@fz-original/app/shared/components/plan-dashboard/plan-dashboard.component';
import {
  FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY,
  FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-route-data.model';

import { canMatchDashboardPlanKindGuard } from '../../shared/guard/can-match-dashboard-plan-kind/can-match-dashboard-plan-kind.guard';
import { canMatchNonResellerGuard } from '../../shared/guard/can-match-non-reseller/can-match-non-reseller.guard';
import { canMatchViewReportsGuard } from '../../shared/guard/can-match-view-reports/can-match-view-reports.guard';
import { legacyDashboardParamsGuard } from '../../shared/guard/legacy-dashboard-params/legacy-dashboard-params.guard';
import { PermissionBasedGuard } from '../../shared/guard/permission-based/permission-based.guard';
import { singularDashboardParamsGuard } from '../../shared/guard/singular-dashboard-params/singular-dashboard-params.guard';
import { FeatureFlags } from '../../shared/optimizely/feature-flags';
import { HasOptimizelyPermissionGuard } from '../../shared/optimizely/has-optimizely-permission.guard';
import { Permissions } from '../../shared/services/user/permissions';
import { analyticsTrackingProvider } from '../reports/tracking/analytics.tracking-provider';
import { ListPlanComponent } from './list-plan/list-plan.component';
import { PlanDashboardResolver } from './plan-dashboard.resolver';
import { PlanRequestManagementComponent } from './plan-request-management/plan-request-management.component';
import { ResellerListPlanComponent } from './reseller-list-plan/reseller-list-plan.component';

const routes: Routes = [
  {
    canActivate: [PermissionBasedGuard],
    component: ListPlanComponent,
    data: {
      hidesSpinnerItself: true,
      permission: ['can_view_plans', 'can_create_plans', 'can_manage_plan_reviews'],
    },
    path: '',
  },
  {
    canActivate: [PermissionBasedGuard],
    component: ResellerListPlanComponent,
    data: {
      permission: 'can_view_reseller_plans',
    },
    path: 'list',
  },
  {
    canActivate: [HasOptimizelyPermissionGuard, PermissionBasedGuard],
    data: {
      module: 'can_cancel_sessions',
      permission: 'can_cancel_sessions',
    },
    path: 'cancellations',
    loadComponent: () => import('./cancellations/partner-cancellations.component').then(m => m.PartnerCancellationsComponent),
  },
  {
    canActivate: [PermissionBasedGuard],
    component: PlanRequestManagementComponent,
    data: {
      permission: ['can_view_create_event', 'can_duplicate_event'],
    },
    path: 'requests',
  },
  {
    canActivate: [HasOptimizelyPermissionGuard, PermissionBasedGuard],
    data: {
      module: FeatureFlags.BULK_EDIT_TICKET_TYPES_CROSS_EVENT,
      permission: Permissions.CAN_MODIFY_TICKET_TYPES,
    },
    loadComponent: () =>
      import('./cross-event-bulk-edit/containers/cross-event-bulk-edit/cross-event-bulk-edit.component').then(
        m => m.CrossEventBulkEditComponent,
      ),
    path: 'bulk-edit',
  },
  /**
   * Gated on `can_view_reports` alone, deliberately, rather than on the plan permissions its legacy
   * sibling below requires. Reaching any of these routes already means clearing the `/plans` parent
   * guard (`can_view_plans` | `can_view_content` | `can_create_plans` | `can_manage_plan_reviews`),
   * and the only profile the two gates would treat differently is one holding `can_view_content`
   * together with `can_view_reports` and no plan permission at all. No built-in role does that — a
   * user carries a single role per organization, and `report_analyst`, the one role with reports
   * access and no plan access, does not clear the parent guard in the first place. Such a role could
   * still be composed in Role Management, and would see here the same screen it can already open at
   * `/reports/three-sixty-analytics` behind that same permission, so nothing is exposed by it.
   *
   * Requiring the plan permissions would instead lock out exactly the analyst profile this is for.
   */
  {
    canActivate: [legacyDashboardParamsGuard],
    canMatch: [canMatchViewReportsGuard, canMatchNonResellerGuard, canMatchDashboardPlanKindGuard],
    data: {
      [FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY]: true,
      [FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY]: 'right',
    },
    loadComponent: () =>
      import('../reports/three-sixty-analytics/three-sixty-analytics.component').then(m => m.ThreeSixtyAnalyticsComponent),
    path: 'dashboard',
    // Without it the component's `FzTrackingService` resolves to the root `provideTracking`, which
    // registers no Mixpanel adapter — so once this becomes the primary way in, the 360 events are
    // dropped for most sessions while the `/reports` mount keeps reporting them.
    providers: [...analyticsTrackingProvider()],
  },
  {
    canActivate: [singularDashboardParamsGuard, PermissionBasedGuard],
    component: PlanDashboardComponent,
    data: {
      [FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY]: true,
      [FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY]: 'right',
      permission: ['can_view_plans', 'can_create_plans', 'can_manage_plan_reviews'],
    },
    path: 'dashboard',
    resolve: { baseResponse: PlanDashboardResolver },
  },
  /** Same permission reasoning as the `dashboard` route above. */
  {
    canActivate: [legacyDashboardParamsGuard],
    canMatch: [canMatchViewReportsGuard, canMatchNonResellerGuard, canMatchDashboardPlanKindGuard],
    data: {
      [FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY]: true,
      [FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY]: 'right',
    },
    loadComponent: () =>
      import('../reports/three-sixty-analytics/three-sixty-analytics.component').then(m => m.ThreeSixtyAnalyticsComponent),
    path: 'dashboard/:id',
    /** Same reason as the sibling above. */
    providers: [...analyticsTrackingProvider()],
  },
  {
    canActivate: [PermissionBasedGuard],
    component: PlanDashboardComponent,
    data: {
      [FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY]: true,
      [FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY]: 'right',
      permission: ['can_view_plans', 'can_create_plans', 'can_manage_plan_reviews'],
    },
    path: 'dashboard/:id',
    resolve: { baseResponse: PlanDashboardResolver },
  },
  {
    canActivate: [PermissionBasedGuard],
    component: PlanDashboardComponent,
    data: {
      [FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY]: true,
      [FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY]: 'right',
      permission: 'can_view_reseller_plans',
    },
    path: 'dashboard/:id/channel/:channelId',
    resolve: { baseResponse: PlanDashboardResolver },
  },
  {
    data: {
      [FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY]: 'right',
    },
    path: ':id',
    redirectTo: 'dashboard/:id',
  }, //TODO Remove when partners don't use this url
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class PlanRoutingModule {}
