import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';

import { of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { PlanDetailPublic } from '../../../shared/models/plan/plan.model';
import { PlanService } from '../../../shared/services/plan/plan.service';

export const ambassadorRegisterResolver: ResolveFn<PlanDetailPublic | false> = route => {
  const AMBASSADORS_REGISTER_CHANNEL_ID = 'ambassadors-register';
  const planId = route.paramMap.get('id');
  const router = inject(Router);
  inject(SpinnerService).show();

  if (!planId) {
    router.navigate(['/ambassadors/plan/not-found']);
    return of(false);
  }

  return inject(PlanService)
    .getPublicPlan(+planId, AMBASSADORS_REGISTER_CHANNEL_ID)
    .pipe(
      catchError(error => {
        router.navigate(['/ambassadors/plan/not-found']);
        return throwError(() => error);
      }),
    );
};
