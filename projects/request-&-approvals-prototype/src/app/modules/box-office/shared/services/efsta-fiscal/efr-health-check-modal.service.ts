import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { EMPTY, map, Observable, of, switchMap, tap } from 'rxjs';

import { EfrHealthCheckModalComponent } from '../../components/efr-health-check-modal/efr-health-check-modal.component';
import { EfrHealthCheckService } from './efr-health-check.service';
import { EfrStateLogThrottle } from './efr-state-log-throttle.service';
import { EfstaDayService } from './efsta-day.service';
import { FRANCE_COUNTRY_CODE, normalizeCountryCode } from './fiscal-country-profile.util';
import {
  EfrGuardPurchaseContext,
  EfrHealthCheckDialogData,
  EfrHealthCheckOptions,
  EfrHealthCheckResult,
  EfrHealthError,
  EfrHealthErrorCode,
  EfrRegistrationFailureModalClose,
  FiscalHealthTarget,
} from './models/efr-health-check.model';
import { EfrPrinterState } from './models/efr-printer-state.model';
import { FiscalDayFlowVariant } from './models/fiscal-country-profile.model';

interface EfrHealthCheckDisplayConfig {
  readonly closeBtnKey?: string;
  readonly closeDayAction?: () => Observable<EfrHealthCheckResult>;
  readonly closeDayActionBtnKey?: string;
  readonly retryBtnKey?: string;
  readonly warningKey?: string;
}

export const SHIFT_START_DISPLAY_CONFIG: EfrHealthCheckDisplayConfig = {
  closeBtnKey: 'boxOffice.fiscal.healthCheck.abortShiftStart',
  warningKey: 'boxOffice.fiscal.healthCheck.shiftStartAbortWarning',
};

@Injectable({
  providedIn: 'root',
})
export class EfrHealthCheckModalService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #dialog = inject(Dialog);
  readonly #efstaDayService = inject(EfstaDayService);
  readonly #healthCheckService = inject(EfrHealthCheckService);
  readonly #logThrottle = inject(EfrStateLogThrottle);

  ensureHealthy(
    countryCode: string | undefined,
    excludeErrors: readonly EfrHealthErrorCode[] = [],
    displayConfig?: EfrHealthCheckDisplayConfig,
  ): Observable<EfrPrinterState | null> {
    return this.#healthCheckService.checkHealth(countryCode, { excludeErrors }).pipe(
      switchMap(result => {
        if (result.healthy) {
          return of(result.state);
        }
        const retryFn = () => this.#healthCheckService.checkHealth(countryCode, { excludeErrors });
        return this.#showDialogWithRetry(result.error!, retryFn, displayConfig).pipe(
          switchMap(retryResult => {
            if (retryResult === null) {
              this.#datadogLogService.logError('EFR health gate aborted', {
                countryCode,
                errorCode: result.error!.code,
                flow: 'ensure-healthy',
              });
              return EMPTY;
            }
            return of(retryResult.state);
          }),
        );
      }),
    );
  }

  guardPurchase(
    countryCode: string | undefined,
    context?: EfrGuardPurchaseContext,
    excludeErrors: readonly EfrHealthErrorCode[] = [],
  ): Observable<boolean> {
    const options: EfrHealthCheckOptions = { excludeErrors, fiscalHealthTarget: this.#resolveFiscalHealthTarget(context) };
    return this.#healthCheckService.checkHealth(countryCode, options).pipe(
      switchMap(result => {
        if (result.healthy) {
          return of(true);
        }
        const error = this.#filterZRequiredCauses(result.error!, context);
        const displayConfig = this.#buildCloseDayConfig(result.error!, result.dayFlow, countryCode, context);
        return this.#showDialogWithRetry(error, () => this.#healthCheckService.checkHealth(countryCode, options), displayConfig).pipe(
          map(retryResult => retryResult !== null),
        );
      }),
    );
  }

  guardPurchaseAfterShiftStart(countryCode: string | undefined, context?: EfrGuardPurchaseContext): Observable<boolean> {
    if (normalizeCountryCode(countryCode) !== FRANCE_COUNTRY_CODE) {
      return of(true);
    }
    return this.guardPurchase(countryCode, context);
  }

  #buildCloseDayConfig(
    error: EfrHealthError,
    dayFlow: FiscalDayFlowVariant | undefined,
    countryCode: string | undefined,
    context?: EfrGuardPurchaseContext,
  ): EfrHealthCheckDisplayConfig | undefined {
    if (dayFlow !== 'hungary') {
      return undefined;
    }
    if (error.code !== EfrHealthErrorCode.Z_REQUIRED || context?.hasActiveShift !== false) {
      return undefined;
    }
    return {
      closeDayAction: () =>
        this.#efstaDayService.closeDay(context.placeId).pipe(switchMap(() => this.#healthCheckService.checkHealth(countryCode))),
    };
  }

  #filterZRequiredCauses(error: EfrHealthError, context?: EfrGuardPurchaseContext): EfrHealthError {
    if (error.code !== EfrHealthErrorCode.Z_REQUIRED) {
      return error;
    }
    if (context?.hasActiveShift === true) {
      return { ...error, causes: error.causes.slice(0, 1) };
    }
    if (context?.hasActiveShift === false) {
      return { ...error, causes: error.causes.slice(1) };
    }
    return error;
  }

  showRetryModal(error: EfrHealthError, onRetry: () => Observable<EfrHealthCheckResult>): Observable<EfrHealthCheckResult | null> {
    return this.#showDialogWithRetry(error, onRetry);
  }

  showRegistrationFailureModal(
    initialUnhealthy: EfrHealthCheckResult,
    onRetry: () => Observable<EfrHealthCheckResult>,
  ): Observable<EfrRegistrationFailureModalClose | null> {
    const initialError = initialUnhealthy.error;
    if (initialError == null) {
      throw new Error('EfrHealthCheckModalService.showRegistrationFailureModal: initialUnhealthy.error is required');
    }
    const dialogRef = this.#dialog.open<EfrRegistrationFailureModalClose | EfrHealthCheckResult | undefined, EfrHealthCheckDialogData>(
      EfrHealthCheckModalComponent,
      {
        backdropClass: 'ignt-modal--background-opaque',
        data: {
          closeBtnKey: 'boxOffice.fiscal.healthCheck.abortModal',
          error: initialError,
          initialUnhealthyResult: initialUnhealthy,
          onRetry,
          retryBtnKey: 'boxOffice.fiscal.healthCheck.tryAgain',
          trackLastUnhealthyOnAbort: true,
          warningKey: 'boxOffice.fiscal.healthCheck.registrationFailureWarning',
        },
        disableClose: true,
      },
    );

    return dialogRef.closed.pipe(
      tap(() => {
        this.#logThrottle.clearUnreadable();
      }),
      map((raw): EfrRegistrationFailureModalClose | null => {
        if (raw == null) {
          return { kind: 'aborted', lastUnhealthy: initialUnhealthy };
        }
        if (this.#isRegistrationFailureModalClose(raw)) {
          return raw;
        }
        return null;
      }),
    );
  }

  showMandatoryRegistrationFailureModal(
    initialUnhealthy: EfrHealthCheckResult,
    onRetry: () => Observable<EfrHealthCheckResult>,
  ): Observable<void> {
    const initialError = initialUnhealthy.error;
    if (initialError == null) {
      throw new Error('EfrHealthCheckModalService.showMandatoryRegistrationFailureModal: initialUnhealthy.error is required');
    }
    const dialogRef = this.#dialog.open<EfrHealthCheckResult | undefined, EfrHealthCheckDialogData>(EfrHealthCheckModalComponent, {
      backdropClass: 'ignt-modal--background-opaque',
      data: {
        error: initialError,
        hideCloseBtn: true,
        initialUnhealthyResult: initialUnhealthy,
        onRetry,
        retryBtnKey: 'boxOffice.fiscal.healthCheck.tryAgain',
        warningKey: 'boxOffice.fiscal.healthCheck.registrationFailureWarning',
      },
      disableClose: true,
    });
    return dialogRef.closed.pipe(
      tap(() => {
        this.#logThrottle.clearUnreadable();
      }),
      map((): undefined => undefined),
    );
  }

  #isRegistrationFailureModalClose(value: unknown): value is EfrRegistrationFailureModalClose {
    if (typeof value !== 'object' || value === null || !('kind' in value)) {
      return false;
    }
    // Safe after object + 'kind' guard: dialog emits our discriminated union only in registration flow
    const kind = (value as { kind: unknown }).kind;
    return kind === 'aborted' || kind === 'success';
  }

  #resolveFiscalHealthTarget(context?: EfrGuardPurchaseContext): FiscalHealthTarget | undefined {
    const cashRegisterId = context?.cashRegisterId;
    const partnerId = context?.partnerId;
    const placeId = context?.placeId;
    if (
      cashRegisterId === undefined ||
      cashRegisterId.length === 0 ||
      partnerId === undefined ||
      placeId === undefined ||
      placeId.length === 0
    ) {
      return undefined;
    }
    return { cashRegisterId, partnerId, placeId };
  }

  #showDialogWithRetry(
    error: EfrHealthError,
    onRetry: () => Observable<EfrHealthCheckResult>,
    displayConfig?: EfrHealthCheckDisplayConfig,
  ): Observable<EfrHealthCheckResult | null> {
    const dialogRef = this.#dialog.open<EfrHealthCheckResult | undefined, EfrHealthCheckDialogData>(EfrHealthCheckModalComponent, {
      backdropClass: 'ignt-modal--background-opaque',
      data: { error, onRetry, ...displayConfig },
      disableClose: true,
    });

    return dialogRef.closed.pipe(
      tap(() => {
        this.#logThrottle.clearUnreadable();
      }),
      map(result => result ?? null),
    );
  }
}
