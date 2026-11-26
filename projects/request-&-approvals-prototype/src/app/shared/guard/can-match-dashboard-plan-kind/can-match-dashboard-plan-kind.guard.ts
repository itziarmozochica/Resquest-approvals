import { inject } from '@angular/core';
import { CanMatchFn, Params, Route, Router, UrlSegment } from '@angular/router';

import { Observable, of } from 'rxjs';
import { defaultIfEmpty, map } from 'rxjs/operators';

import { LEGACY_ONLY_DASHBOARD_PLAN_KINDS } from '../../models/plan/legacy-only-dashboard-plan-kinds.constant';
import { Plan } from '../../models/plan/plan.model';
import { PartnerService } from '../../services/partner/partner.service';
import { PlanService } from '../../services/plan/plan.service';
import { isDraftOrNeverPublished } from '../../utils/is-draft-or-never-published.util';
import { parseSingleIdParam, readForcedPartnerId } from '../../utils/single-id-query-param.util';

/**
 * Matches the new dashboard only when it has something to render for the targeted event.
 * Waitlist, auction and prize draw plans are served from their own graph groups, and drafts
 * and events still awaiting their first publication are served by the legacy dashboard's own
 * screens (the creation wizard and the ready panel), so a navigation aimed at a single plan in
 * any of those states falls through to it. Multi-event selections always match: they cannot
 * describe a single plan.
 *
 * The organization is resolved from an id rather than waited for, for the reason spelled out in
 * `canMatchNonResellerGuard`: waiting on `observePartner()` during recognition waits for something
 * activation has not run yet, and the navigation never completes.
 */
export const canMatchDashboardPlanKindGuard: CanMatchFn = (_route: Route, segments: UrlSegment[]): Observable<boolean> | boolean => {
  const router = inject(Router);
  const planId: number | undefined = resolveSinglePlanId(segments, router);
  if (planId === undefined) {
    return true;
  }

  const forcedPartner = readForcedPartnerId(router);
  const organizationId: number | null = forcedPartner.id ?? inject(PartnerService).getActingOrganizationId();
  if (organizationId === null) {
    return of(true);
  }

  return inject(PlanService)
    .getPlan(organizationId, planId)
    .pipe(
      map(response => matchesNewDashboard(response.data)),
      /**
       * `getPlan` returns `EMPTY` for a blocked distributor route, and a `canMatch` that completes
       * without emitting leaves the navigation unresolved — the blank page again, by another road.
       */
      defaultIfEmpty(true),
    );
};

/**
 * Waitlist, auction and prize draw plans are served from their own graph groups, and drafts and
 * events still awaiting their first publication are served by the legacy dashboard's own screens.
 * A plan the request could not resolve matches, so a lookup failure never hides the dashboard.
 */
function matchesNewDashboard(plan: Plan | null): boolean {
  if (plan === null) {
    return true;
  }
  const isLegacyOnlyKind: boolean = plan.kind !== undefined && LEGACY_ONLY_DASHBOARD_PLAN_KINDS.has(plan.kind);
  return !isLegacyOnlyKind && !isDraftOrNeverPublished(plan);
}

/**
 * The plan id is in the path for `/plans/dashboard/:id` and in the query params otherwise.
 * `canMatch` receives no snapshot, so the in-flight navigation is the only source of query
 * params at this point.
 */
function resolveSinglePlanId(segments: UrlSegment[], router: Router): number | undefined {
  const dashboardIndex: number = segments.findIndex(segment => segment.path === 'dashboard');
  const pathId: string | undefined = dashboardIndex === -1 ? undefined : segments[dashboardIndex + 1]?.path;
  if (pathId !== undefined) {
    return parseSingleIdParam(pathId);
  }

  const navigation = router.getCurrentNavigation();
  const queryParams: Params = navigation?.extractedUrl?.queryParams ?? navigation?.initialUrl?.queryParams ?? {};
  return parseSingleIdParam(queryParams['planIds']) ?? parseSingleIdParam(queryParams['planId']);
}
