import { inject, Injectable } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { defer, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { BaseErrorResponse, BaseResponse } from '../../../shared/models/base-response';
import { Partner } from '../../../shared/models/partner/partner.model';
import { User } from '../../../shared/models/user/user.model';
import { SearchBarService } from '../../../shared/search-bar/service/search-bar.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { UserService } from '../../../shared/services/user/user.service';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { PlanStateService } from '../../reservation/services/plan-state.service';
import { PlanRequestService } from '../plan-request/services/plan-request.service';
import { clickDuplicatePlan } from '../tracking/events/click-duplicate-plan.event';
import { successDuplicatePlan } from '../tracking/events/success-duplicate-plan.event';
import { DuplicatePlanParams, DuplicatePlanResponseBody, DuplicatePlanSuccess, GENERIC_ERROR } from './duplicate-plan-result.model';

@Injectable()
export class DuplicatePlanOrchestratorService {
  readonly #fzTracking = inject(FzTrackingService);
  readonly #partnerService = inject(PartnerService);
  readonly #planRequestService = inject(PlanRequestService);
  readonly #planStateService = inject(PlanStateService);
  readonly #searchBarService = inject(SearchBarService);
  readonly #userService = inject(UserService);

  executeDuplicate(params: DuplicatePlanParams): Observable<DuplicatePlanSuccess> {
    const { planId, planName, source } = params;

    return defer(() => {
      this.#fzTracking.track(clickDuplicatePlan({ planId, source }));

      const partner: Partner | null = this.#partnerService.getPartner();
      const user: User | null = this.#userService.getUser();

      if (!partner || !user) {
        return throwError(() => GENERIC_ERROR);
      }

      return this.#planRequestService.duplicatePlan(planId, planName, partner.id, user).pipe(
        switchMap((response: BaseResponse<DuplicatePlanResponseBody | null>): Observable<DuplicatePlanSuccess> => {
          if (response.error) {
            return throwError(() => response.error);
          }

          const duplicatedPlanId = response.data?.id;
          if (duplicatedPlanId == null) {
            return throwError(() => GENERIC_ERROR);
          }

          this.#fzTracking.track(successDuplicatePlan({ duplicatedPlanId, planId, source }));
          this.#applySharedSideEffects();

          return of({ planId, planName, source, duplicatedPlanId });
        }),
        catchError((error: unknown) => {
          if (this.#isBaseErrorResponse(error)) {
            return throwError(() => error);
          }

          return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
        }),
      );
    });
  }

  #applySharedSideEffects(): void {
    this.#planStateService.reset();
    this.#searchBarService.clearPlanList();
  }

  #isBaseErrorResponse(error: unknown): error is BaseErrorResponse {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      typeof (error as BaseErrorResponse).code !== 'undefined' &&
      typeof (error as BaseErrorResponse).message === 'string'
    );
  }
}
