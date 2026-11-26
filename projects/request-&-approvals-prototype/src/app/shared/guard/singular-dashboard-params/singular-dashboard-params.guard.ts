import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Params, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

/**
 * Mirror of `legacyDashboardParamsGuard` for the legacy plan dashboard: rewrites the plural
 * `planIds`/`cityIds` params back to the singular ones it reads. Entry points that always
 * emit the plural form for reports users — the sidebar link, shared deep links — still land
 * on the right event when the plan kind sends them here.
 */
export const singularDashboardParamsGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): boolean | UrlTree => {
  const hasSingularPlan = route.paramMap.get('id') !== null || route.queryParamMap.get('planId') !== null;
  const planId: string | null = singleValue(route.queryParamMap.get('planIds'));
  if (hasSingularPlan || planId === null) {
    return true;
  }

  const cityId: string | null = route.queryParamMap.get('cityId') ?? singleValue(route.queryParamMap.get('cityIds'));

  // `PlanRoutingModule` is mounted at both `/plans` and `/my-plans`, so the rewrite has to stay on
  // the mount it arrived through — an absolute `/plans/dashboard` would drop a reseller out of their
  // own area and into one their permissions may not cover.
  const [currentPath] = state.url.split('?');

  /**
   * Carried over rather than rebuilt, the same way `legacyDashboardParamsGuard` does it in the other
   * direction: a link arriving here holds more than the two keys being renamed, and dropping the rest
   * changes what the destination does. `channelId` is the sharp one — `PlanKindViewGuard` reads it to
   * choose between `getResellerPlan` and `getPlan` — but currency and tracking params are lost too.
   * `statuses` stays dropped on purpose: it is a 360 filter the legacy dashboard does not read.
   */
  const preservedParams: Params = { ...route.queryParams };
  delete preservedParams['cityIds'];
  delete preservedParams['planIds'];
  delete preservedParams['statuses'];

  return inject(Router).createUrlTree([currentPath], {
    queryParams: {
      ...preservedParams,
      ...(cityId !== null && { cityId }),
      planId,
    },
  });
};

/**
 * A multi-select value (`planIds=1,2`) describes no single event, so it is left untouched.
 */
function singleValue(value: string | null): string | null {
  return value === null || value === '' || value.includes(',') ? null : value;
}
