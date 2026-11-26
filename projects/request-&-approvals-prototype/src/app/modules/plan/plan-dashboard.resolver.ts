import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, finalize, mergeMap } from 'rxjs/operators';

export interface PlanData {
  plan: Plan | null;
}

@Injectable({
  providedIn: 'root',
})
export class PlanDashboardResolver {
  constructor(
    private partnerService: PartnerService,
    private router: Router,
    private planService: PlanService,
    private spinnerService: SpinnerService,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<PlanData> {
    this.spinnerService.show();
    const planIdParam = route.paramMap?.get('id') ?? route.queryParamMap?.get('planId');
    if (!planIdParam) {
      this.spinnerService.hide();
      return of({ plan: null });
    }
    const planId = Number(planIdParam);
    if (isNaN(planId)) {
      this.spinnerService.hide();
      this.router.navigate(['/plans']);
      return EMPTY;
    }
    const channelId = route.paramMap?.get('channelId') ?? route.queryParamMap?.get('channelId') ?? undefined;
    const partner = this.partnerService.getPartner();
    if (!partner) {
      this.spinnerService.hide();
      this.router.navigate(['/plans']);
      return of({ plan: null });
    }
    const getPlan$ =
      partner.type && this.partnerService.isReseller(partner.type)
        ? this.planService.getResellerPlan(partner.id, planId, channelId)
        : this.planService.getPlan(partner.id, planId);

    return getPlan$.pipe(
      mergeMap(response => {
        if (response.error?.code === 'PLAN_PERMISSION_DENIED') {
          this.router.navigate(['/login']);
          return of({ plan: null });
        }
        return of({ plan: response.data });
      }),
      catchError(error => {
        this.router.navigate([], {});
        this.spinnerService.hide();
        return of(error);
      }),
      finalize(() => this.spinnerService.hide()),
    );
  }
}
