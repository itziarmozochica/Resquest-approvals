import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, GuardResult, Router, RouterModule, ROUTES, Routes } from '@angular/router';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PermissionBasedGuard } from '../../shared/guard/permission-based/permission-based.guard';
import { PlanDetail } from '../../shared/models/plan/plan-detail.model';
import { FeatureFlags } from '../../shared/optimizely/feature-flags';
import { HasOptimizelyPermissionGuard } from '../../shared/optimizely/has-optimizely-permission.guard';
import { OptimizelyModule } from '../../shared/optimizely/optimizely.module';
import { OptimizelyService } from '../../shared/optimizely/optimizely.service';
import { Permissions } from '../../shared/services/user/permissions';
import { UserService } from '../../shared/services/user/user.service';
import { ContentPlanComponent } from './components/content-plan/content-plan.component';
import { PlanContentEditionComponent } from './components/plan-edition/plan-content-edition/plan-content-edition.component';
import { PlanEditionComponent } from './components/plan-edition/plan-edition.component';
import { PlanGalleryEditionComponent } from './components/plan-edition/plan-gallery-edition/plan-gallery-edition.component';
import { PlanTagsEditionComponent } from './components/plan-edition/plan-tags-edition/plan-tags-edition.component';
import { PlanVenueEditionComponent } from './components/plan-edition/plan-venue-edition/plan-venue-edition.component';
import { ContentPlanTabsResolver } from './content-plan-tabs.resolver';
import { candlelightPlanGuard } from './guards/candlelight-plan.guard';
import { contentPlanUnsavedChangesGuard } from './guards/content-plan-unsaved-changes.guard';
import { buildPlanEditionTabsOptions, buildPlanEditionTabUrl, loadPlanEditionPlanDetail } from './utils/plan-edition-tabs-options.util';

export const planEditionDefaultTabGuard: CanActivateFn = (route: ActivatedRouteSnapshot): GuardResult | Observable<GuardResult> => {
  const contentPlanTabsResolver = inject(ContentPlanTabsResolver);
  const router = inject(Router);
  const userService = inject(UserService);

  const resolveDefaultTab = (planDetail: PlanDetail | null): GuardResult => {
    const tabsOptions = buildPlanEditionTabsOptions(planDetail);

    return buildPlanEditionTabUrl(router, route, contentPlanTabsResolver.getFirstAvailableTabPath(tabsOptions));
  };

  if (userService.hasPermission(Permissions.CAN_VIEW_CONTENT)) {
    return resolveDefaultTab(null);
  }

  return loadPlanEditionPlanDetail(route.queryParamMap.get('planId')).pipe(map(resolveDefaultTab));
};

const planEditionTabCanDeactivate = [contentPlanUnsavedChangesGuard];

export const regularRoute: Routes = [{ canDeactivate: planEditionTabCanDeactivate, component: ContentPlanComponent, path: '' }];

export function buildEditionRoute(): Routes {
  return [
    {
      children: [
        { canActivate: [planEditionDefaultTabGuard], children: [], path: '', pathMatch: 'full' },
        {
          canActivate: [PermissionBasedGuard],
          canDeactivate: planEditionTabCanDeactivate,
          component: PlanContentEditionComponent,
          data: {
            permission: Permissions.CAN_VIEW_CONTENT,
          },
          path: 'content-edit',
        },
        {
          canActivate: [PermissionBasedGuard],
          canDeactivate: planEditionTabCanDeactivate,
          component: PlanGalleryEditionComponent,
          data: {
            permission: Permissions.CAN_VIEW_CONTENT,
          },
          path: 'gallery-edit',
        },
        {
          canActivate: [HasOptimizelyPermissionGuard, PermissionBasedGuard],
          canDeactivate: planEditionTabCanDeactivate,
          component: PlanVenueEditionComponent,
          data: {
            module: FeatureFlags.PLAN_EDITION_VENUE,
            permission: [Permissions.CAN_MANAGE_VENUES],
          },
          path: 'venue-edit',
        },
        {
          canActivate: [HasOptimizelyPermissionGuard, PermissionBasedGuard],
          canDeactivate: planEditionTabCanDeactivate,
          data: {
            module: FeatureFlags.ENABLE_MAIN_PLAN_TRANSLATIONS,
            permission: Permissions.CAN_MANAGE_MAIN_PLAN_TRANSLATIONS,
          },
          path: 'translations-edit',
          loadComponent: () =>
            import('./components/plan-edition/plan-translations-edition/plan-translations-edition.component').then(
              m => m.PlanTranslationsEditionComponent,
            ),
        },
        {
          canActivate: [PermissionBasedGuard],
          canDeactivate: planEditionTabCanDeactivate,
          component: PlanTagsEditionComponent,
          data: {
            permission: Permissions.CAN_VIEW_TAGS,
          },
          path: 'tags-edit',
        },
        {
          path: 'terms-and-conditions-edit',
          loadComponent: () =>
            import('./components/plan-edition/plan-terms-and-conditions-edit/plan-terms-and-conditions-edit.component').then(
              m => m.PlanTermsAndConditionsEditComponent,
            ),
          canActivate: [PermissionBasedGuard],
          canDeactivate: planEditionTabCanDeactivate,
          data: {
            permission: Permissions.CAN_VIEW_CONTENT,
          },
        },
        {
          canActivate: [HasOptimizelyPermissionGuard, PermissionBasedGuard],
          canDeactivate: planEditionTabCanDeactivate,
          data: {
            module: FeatureFlags.IMMERSIVE_PLAN_LAYOUT_EDITOR,
            permission: Permissions.CAN_VIEW_CONTENT,
          },
          path: 'immersive-plan-layout-edit',
          loadComponent: () =>
            import('./components/plan-edition/immersive-plan-layout/immersive-plan-layout-edition.component').then(
              m => m.ImmersivePlanLayoutEditionComponent,
            ),
        },
        {
          canActivate: [PermissionBasedGuard, candlelightPlanGuard],
          canDeactivate: planEditionTabCanDeactivate,
          data: {
            permission: Permissions.CAN_VIEW_CONTENT,
          },
          path: 'metadata-edit',
          loadComponent: () =>
            import('./components/plan-edition/plan-metadata-edition/plan-metadata-edition.component').then(
              m => m.PlanMetadataEditionComponent,
            ),
        },
      ],
      component: PlanEditionComponent,
      path: '',
    },
  ];
}

function getCalculatedRoutes(optimizelyService: OptimizelyService): Routes {
  return optimizelyService.isFeatureEnabled(FeatureFlags.DIRECT_PLAN_EDITION) ? buildEditionRoute() : regularRoute;
}

@NgModule({
  exports: [RouterModule, OptimizelyModule],
  providers: [
    {
      deps: [OptimizelyService],
      provide: ROUTES,
      useFactory: (optimizelyService: OptimizelyService) => getCalculatedRoutes(optimizelyService),
    },
  ],
})
export class ContentPlanRoutingModule {}
