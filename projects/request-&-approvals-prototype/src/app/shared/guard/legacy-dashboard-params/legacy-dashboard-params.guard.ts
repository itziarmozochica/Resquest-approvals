import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Params, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { DASHBOARD_PLAN_STATUSES } from '../../models/plan/dashboard-plan-statuses.constant';

/**
 * Normalizes legacy plan dashboard links (`?planId=&cityId=` or `/dashboard/:id`) to the
 * plural `planIds`/`cityIds` params the new dashboard filters read, so old bookmarks land
 * prefiltered on the event they pointed to.
 */
export const legacyDashboardParamsGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree => {
  const planId: string | null = route.paramMap.get('id') ?? route.queryParamMap.get('planId');
  const cityId: string | null = route.queryParamMap.get('cityId');

  const hasLegacyParams = planId !== null || cityId !== null;
  const hasNewParams = route.queryParamMap.get('planIds') !== null || route.queryParamMap.get('cityIds') !== null;
  if (!hasLegacyParams || hasNewParams) {
    return true;
  }

  // `PlanRoutingModule` is mounted at both `/plans` and `/my-plans`, so the rewrite stays on the
  // mount it arrived through; the `:id` segment goes because it becomes a `planIds` query param.
  const [currentPath] = state.url.split('?');
  const dashboardPath = route.paramMap.get('id') !== null ? currentPath.slice(0, currentPath.lastIndexOf('/')) : currentPath;

  // Only the two params being renamed are dropped. Rebuilding the whole set from scratch would
  // silently discard anything else the link carried — a `currency` on a shared deep link most of all.
  const preservedParams: Params = { ...route.queryParams };
  delete preservedParams['cityId'];
  delete preservedParams['planId'];

  return inject(Router).createUrlTree([dashboardPath], {
    queryParams: {
      // A legacy link names one event and carries no status filter of its own, so the dashboard
      // default would hide that event outright when it is a draft or off sale.
      ...(planId !== null && preservedParams['statuses'] === undefined && { statuses: DASHBOARD_PLAN_STATUSES }),
      ...preservedParams,
      ...(cityId !== null && { cityIds: cityId }),
      ...(planId !== null && { planIds: planId }),
    },
  });
};
