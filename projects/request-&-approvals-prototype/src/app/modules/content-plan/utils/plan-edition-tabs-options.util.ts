import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PlanDetail } from '../../../shared/models/plan/plan-detail.model';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { PlanDetailService } from '../../../shared/services/plan/plan-detail.service';
import { planRequiresTermsAndConditions } from '../../plan/plan-creation/components/utils/plan-content-completion.util';
import { ContentPlanTabsOptions } from '../content-plan-tabs.resolver';
import { EditingPlanService } from '../services/editing-plan/editing-plan.service';

export function buildPlanEditionTabsOptions(planDetail: PlanDetail | null): ContentPlanTabsOptions {
  if (planDetail === null) {
    return {};
  }

  return {
    isCandlelight: planDetail.isCandlelight,
    planRequiringTermsAndConditions: planRequiresTermsAndConditions({ type: planDetail.type ?? '' }),
    showVenueTab: planDetail.venues.length === 1,
  };
}

export function parsePlanIdParam(value: unknown): number | null {
  const planId = Number(value);

  return Number.isInteger(planId) && planId > 0 ? planId : null;
}

export function buildPlanEditionTabUrl(router: Router, route: ActivatedRouteSnapshot, tabPath: string | null): UrlTree {
  const planEditionSegments = route.pathFromRoot.slice(0, -1).flatMap(snapshot => snapshot.url.map(segment => segment.path));
  const tabSegments = tabPath === null ? [] : [tabPath];

  return router.createUrlTree(['/', ...planEditionSegments, ...tabSegments], { queryParams: route.queryParams });
}

export function loadPlanEditionPlanDetail(planIdParam: unknown): Observable<PlanDetail | null> {
  const partnerId = inject(PartnerService).getPartner()?.id;
  const planId = parsePlanIdParam(planIdParam);

  if (partnerId == null || planId === null) {
    return of(null);
  }

  const selectedPlanDetail = inject(EditingPlanService).getSelectedPlanDetail()?.data;
  if (selectedPlanDetail?.id === planId) {
    return of(selectedPlanDetail);
  }

  return inject(PlanDetailService)
    .getPlanDetail(partnerId, planId)
    .pipe(catchError(() => of(null)));
}
