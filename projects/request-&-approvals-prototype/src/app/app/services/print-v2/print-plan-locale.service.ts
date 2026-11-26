import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { PlanDetailService } from '@fz-original/app/shared/services/plan/plan-detail.service';
import { catchError, map, Observable, of, tap, timeout } from 'rxjs';

import { printCommandDefaultLocale } from './models/print-command.model';

@Injectable({
  providedIn: 'root',
})
export class PrintPlanLocaleService {
  static readonly fetchTimeoutMs = 3000;

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #planDetailService = inject(PlanDetailService);
  readonly #localesByPlanId = new Map<number, string>();

  resolve$(partnerId: number, planId: number | undefined): Observable<string> {
    if (planId === undefined) {
      return of(printCommandDefaultLocale);
    }
    const cached: string | undefined = this.#localesByPlanId.get(planId);
    if (cached !== undefined) {
      return of(cached);
    }

    return this.#planDetailService.getPlanDetail(partnerId, planId).pipe(
      timeout(PrintPlanLocaleService.fetchTimeoutMs),
      map((planDetail: PlanDetail) => planDetail.baseLocale?.trim() || printCommandDefaultLocale),
      tap((locale: string) => this.#localesByPlanId.set(planId, locale)),
      catchError((error: unknown) => {
        this.#datadogLogService.logWarn('[Printer][V2] Plan locale resolution failed, falling back to the default locale', {
          planId,
          reason: error instanceof Error ? error.message : 'unknown',
        });

        return of(printCommandDefaultLocale);
      }),
    );
  }
}
