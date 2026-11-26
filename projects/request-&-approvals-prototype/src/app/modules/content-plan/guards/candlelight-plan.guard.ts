import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, GuardResult, Router, UrlTree } from '@angular/router';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PlanDetail } from '../../../shared/models/plan/plan-detail.model';
import { ContentPlanTabsResolver } from '../content-plan-tabs.resolver';
import { buildPlanEditionTabsOptions, buildPlanEditionTabUrl, loadPlanEditionPlanDetail } from '../utils/plan-edition-tabs-options.util';

export const candlelightPlanGuard: CanActivateFn = (route: ActivatedRouteSnapshot): Observable<GuardResult> => {
  const router = inject(Router);
  const contentPlanTabsResolver = inject(ContentPlanTabsResolver);

  const redirectToFirstAvailableTab = (planDetail: PlanDetail | null): UrlTree => {
    const tabsOptions = buildPlanEditionTabsOptions(planDetail);
    const hasAvailableTabs = contentPlanTabsResolver.getAvailableTabs(tabsOptions).length > 0;

    return buildPlanEditionTabUrl(router, route, hasAvailableTabs ? contentPlanTabsResolver.getFirstAvailableTabPath(tabsOptions) : null);
  };

  return loadPlanEditionPlanDetail(route.queryParamMap.get('planId')).pipe(
    map(planDetail => (planDetail?.isCandlelight === true ? true : redirectToFirstAvailableTab(planDetail))),
  );
};
