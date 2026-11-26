import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { defer, Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';

import { EfrHealthCheckModalService, SHIFT_START_DISPLAY_CONFIG } from './efr-health-check-modal.service';
import { EfstaDayService } from './efsta-day.service';
import { isFiscalDayFlowEnabled, isHungarianFiscalDayFlow } from './efsta-fiscal.util';
import { buildComplianceLog, ComplianceLogData } from './models/compliance-log.model';
import { EfrHealthErrorCode } from './models/efr-health-check.model';
import { EfrPrinterState } from './models/efr-printer-state.model';
import { HuOpeningBalanceContext } from './models/hu-opening-balance-context.model';

@Injectable({
  providedIn: 'root',
})
export class HuOpeningBalanceService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #efstaDayService = inject(EfstaDayService);
  readonly #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #userService = inject(UserService);

  ensureEfrHealthy(countryCode: string | undefined): Observable<EfrPrinterState | null> {
    return this.#efrHealthCheckModalService.ensureHealthy(
      countryCode,
      [EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN, EfrHealthErrorCode.Z_REQUIRED],
      SHIFT_START_DISPLAY_CONFIG,
    );
  }

  logout(placeId: number, countryCode: string | undefined): Observable<void> {
    return defer(() => {
      if (!isFiscalDayFlowEnabled(this.#optimizelyService, countryCode)) {
        return of(undefined);
      }
      const { operatorId, operatorName } = this.#getOperatorData();
      return this.#efstaDayService.logout(String(placeId), operatorId, operatorName).pipe(
        take(1),
        catchError(() => of(null)),
        map((): void => undefined),
      );
    });
  }

  openFiscalDayIfNeeded(state: EfrPrinterState | null, context: HuOpeningBalanceContext): Observable<boolean> {
    if (!isHungarianFiscalDayFlow(this.#optimizelyService, context.placeCountryCode)) {
      return of(true);
    }
    return this.#resolveFromState(state, context);
  }

  sendLogin(placeId: number, countryCode: string | undefined): void {
    if (!isFiscalDayFlowEnabled(this.#optimizelyService, countryCode)) {
      return;
    }
    const { operatorId, operatorName } = this.#getOperatorData();
    this.#efstaDayService
      .login(String(placeId), operatorId, operatorName)
      .pipe(
        take(1),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  sendLogout(placeId: number, countryCode: string | undefined): void {
    this.logout(placeId, countryCode).subscribe();
  }

  #getOperatorData(): { operatorId: string; operatorName: string } {
    const user = this.#userService.getUser();
    return {
      operatorId: String(this.#userService.getUserId() ?? ''),
      operatorName: user?.name ?? '',
    };
  }

  #logCompleted(context: HuOpeningBalanceContext, efrResponseCode: string | undefined): void {
    this.#datadogLogService.logInfo(
      'EFSTA opening balance completed',
      buildComplianceLog(
        'opening-balance',
        {
          country: context.placeCountryCode,
          onsiteSetupId: context.onsiteSetupId,
          partnerId: context.partnerId,
        },
        {
          efrResponseCode,
        },
      ),
    );
  }

  #logFailed(context: HuOpeningBalanceContext, efrResponseCode?: string | undefined, reason?: string): void {
    this.#datadogLogService.logError(
      'EFSTA opening balance failed',
      buildComplianceLog(
        'opening-balance',
        {
          country: context.placeCountryCode,
          onsiteSetupId: context.onsiteSetupId,
          partnerId: context.partnerId,
        },
        {
          details: reason,
          efrResponseCode,
          errorCode: 'EFR_OPENING_BALANCE_FAILED',
        },
      ),
    );
  }

  #logSkipped(context: HuOpeningBalanceContext): void {
    this.#datadogLogService.logInfo(
      'EFSTA opening balance skipped - fiscal day already open',
      buildComplianceLog('opening-balance', {
        country: context.placeCountryCode,
        onsiteSetupId: context.onsiteSetupId,
        partnerId: context.partnerId,
      }),
    );
  }

  #resolveFromState(state: EfrPrinterState | null, context: HuOpeningBalanceContext): Observable<boolean> {
    if (state?.dayOpen === true) {
      this.#logSkipped(context);
      return of(true);
    }
    if (state?.dayOpen === false) {
      return this.#tryOpenDay(context);
    }
    this.#logFailed(context, undefined, 'EFR day state unknown');
    return of(false);
  }

  #tryOpenDay(context: HuOpeningBalanceContext): Observable<boolean> {
    const logContext: Partial<ComplianceLogData> = {
      country: context.placeCountryCode,
      onsiteSetupId: context.onsiteSetupId,
      partnerId: context.partnerId,
    };
    return this.#efstaDayService.openDay(String(context.placeId), context.initialAmount, logContext).pipe(
      take(1),
      map(response => {
        const success = response?.TraC?.Result?.RC === 'OK';
        if (success) {
          this.#logCompleted(context, response.TraC?.Result?.RC);
        } else {
          this.#logFailed(context, response?.TraC?.Result?.RC);
        }
        return success;
      }),
    );
  }
}
