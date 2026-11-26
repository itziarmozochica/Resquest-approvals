import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { catchError, map, Observable, of } from 'rxjs';

import { CheckoutEligibilityApiService } from './checkout-eligibility-api.service';
import { FiscalComplianceBlockModalService } from './fiscal-compliance-block-modal.service';

export interface FiscalComplianceBlockGuardContext {
  readonly channelId: string;
  readonly complianceCheckoutEnabled: boolean | undefined;
  readonly hasActiveShift: boolean;
  readonly onsiteSetupId: string | undefined;
  readonly partnerId: number;
  readonly planIds: readonly number[];
}

@Injectable({
  providedIn: 'root',
})
export class FiscalComplianceBlockGuardService {
  readonly #checkoutEligibilityApiService = inject(CheckoutEligibilityApiService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #modalService = inject(FiscalComplianceBlockModalService);
  readonly #userService = inject(UserService);

  guardPurchase(context: FiscalComplianceBlockGuardContext): Observable<boolean> {
    const userId = this.#userService.getUserId();
    // Partners only runs the fiscal compliance guards with an opened shift.
    if (
      context.hasActiveShift === false ||
      context.complianceCheckoutEnabled === false ||
      context.onsiteSetupId === undefined ||
      userId === undefined ||
      context.planIds.length === 0
    ) {
      return of(true);
    }

    return this.#checkoutEligibilityApiService
      .check({
        channelId: context.channelId,
        onsiteSetupId: context.onsiteSetupId,
        partnerId: context.partnerId,
        planIds: context.planIds,
        userId,
      })
      .pipe(
        map((): boolean => true),
        catchError((error: unknown) => {
          if (this.#modalService.openIfNeeded(error)) {
            return of(false);
          }
          this.#datadogLogService.logWarn('Checkout eligibility check failed, prepare cart will enforce it', {
            onsiteSetupId: context.onsiteSetupId,
            partnerId: context.partnerId,
            planIds: context.planIds,
            status: error instanceof HttpErrorResponse ? error.status : null,
          });
          return of(true);
        }),
      );
  }
}
