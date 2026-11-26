import { HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable, of } from 'rxjs';

import { EfrHealthCheckPendingModalService } from './efr-health-check-pending-modal.service';
import {
  describeDeviceFaults,
  detectPolicyError,
  isAnySignalExplainedByATriggeredRule,
  isSignalGoverned,
  resolveEfrHealthPolicy,
} from './efr-health-policy.util';
import { EfrStateLogThrottle } from './efr-state-log-throttle.service';
import { EfstaEfrStateService } from './efsta-efr-state.service';
import { FRANCE_COUNTRY_CODE, normalizeCountryCode, resolveFiscalCountryProfile } from './fiscal-country-profile.util';
import { FranceFiscalHealthApiService } from './france-fiscal-health-api.service';
import {
  EFR_HEALTH_ERROR_CONFIG,
  EfrHealthCheckOptions,
  EfrHealthCheckResult,
  EfrHealthError,
  EfrHealthErrorCode,
  EfrHealthErrorConfig,
  EfrResolvedCause,
  FiscalHealthTarget,
  fiscalServicePendingDialogData,
} from './models/efr-health-check.model';
import { EfrHealthPolicy, EfrStateObserved, EfrStateReadout } from './models/efr-state-readout.model';
import { FranceFiscalHealthOutcome } from './models/france-fiscal-health.model';

@Injectable({
  providedIn: 'root',
})
export class EfrHealthCheckService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #efrStateService = inject(EfstaEfrStateService);
  readonly #franceFiscalHealthApiService = inject(FranceFiscalHealthApiService);
  readonly #logThrottle = inject(EfrStateLogThrottle);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #pendingModalService = inject(EfrHealthCheckPendingModalService);
  readonly #translateService = inject(TranslateService);

  checkHealth(countryCode: string | undefined, options?: EfrHealthCheckOptions): Observable<EfrHealthCheckResult> {
    if (normalizeCountryCode(countryCode) === FRANCE_COUNTRY_CODE) {
      return this.#checkFranceFiscalHealth(countryCode, options);
    }

    const profile = resolveFiscalCountryProfile(this.#optimizelyService, countryCode);
    if (profile === undefined) {
      return of({ error: null, healthy: true, state: null });
    }

    return this.#pendingModalService.trackPending(this.#efrStateService.getPrinterState(profile.printerStateSource)).pipe(
      map((readout: EfrStateReadout) => {
        const result: EfrHealthCheckResult = { ...this.evaluateReadout(readout, options), dayFlow: profile.dayFlow };

        this.#logReadoutObservations(readout, result, countryCode);

        if (!result.healthy) {
          this.#datadogLogService.logError('EFR health check failed', {
            countryCode,
            dialect: readout.source,
            errorCode: result.error!.code,
            notObservedSignals: readout.kind === 'observed' ? readout.notObservedSignals : [],
          });
        }

        return result;
      }),
    );
  }

  evaluateReadout(readout: EfrStateReadout, options?: EfrHealthCheckOptions): EfrHealthCheckResult {
    const errorCode = this.#detectError(readout, options);
    const error = errorCode !== null ? this.#resolveError(errorCode) : null;
    return { error, healthy: error === null, source: readout.source, state: readout.kind === 'observed' ? readout.state : null };
  }

  #checkFranceFiscalHealth(countryCode: string | undefined, options?: EfrHealthCheckOptions): Observable<EfrHealthCheckResult> {
    const target = options?.fiscalHealthTarget;
    if (target === undefined) {
      return of({ error: null, healthy: true, state: null });
    }

    return this.#pendingModalService.trackPending(this.#franceFiscalHealthApiService.check(target), fiscalServicePendingDialogData).pipe(
      map((outcome: FranceFiscalHealthOutcome): EfrHealthCheckResult => {
        const errorCode = this.#toFranceErrorCode(outcome, options?.excludeErrors ?? []);
        const error = errorCode !== null ? this.#resolveError(errorCode) : null;
        this.#logFranceOutcome(outcome, errorCode, countryCode, target);
        return { error, healthy: error === null, state: null };
      }),
    );
  }

  #detectError(readout: EfrStateReadout, options?: EfrHealthCheckOptions): EfrHealthErrorCode | null {
    const excluded = options?.excludeErrors ?? [];

    if (readout.kind === 'unreachable') {
      return this.#toErrorOrNull(EfrHealthErrorCode.EFR_UNREACHABLE, excluded);
    }
    if (readout.kind === 'unreadable') {
      return this.#toErrorOrNull(EfrHealthErrorCode.EFR_STATE_UNREADABLE, excluded);
    }
    return detectPolicyError(resolveEfrHealthPolicy(readout.source), readout.state, excluded);
  }

  #logReadoutObservations(readout: EfrStateReadout, result: EfrHealthCheckResult, countryCode: string | undefined): void {
    if (readout.kind !== 'observed') {
      return;
    }
    const policy = resolveEfrHealthPolicy(readout.source);
    this.#logDisagreedSignals(readout, countryCode);
    this.#logInformationalFiscalDay(readout, policy, countryCode);
    this.#logFalseHealthyVerdict(readout, result, policy, countryCode);
  }

  #logDisagreedSignals(readout: EfrStateObserved, countryCode: string | undefined): void {
    if (readout.disagreedSignals.length === 0) {
      return;
    }
    const key = `disagreed|${readout.source}|${readout.disagreedSignals.join(',')}`;
    if (!this.#logThrottle.tryAcquireLogSlot(key)) {
      return;
    }
    this.#datadogLogService.logInfo('EFR health signal sources disagreed', {
      countryCode,
      dialect: readout.source,
      disagreedSignals: readout.disagreedSignals,
    });
  }

  #logInformationalFiscalDay(readout: EfrStateObserved, policy: EfrHealthPolicy, countryCode: string | undefined): void {
    if (readout.state.dayOpen !== false || isSignalGoverned(policy, 'dayOpen')) {
      return;
    }
    const key = `fiscal-day-not-open|${readout.source}`;
    if (!this.#logThrottle.tryAcquireLogSlot(key)) {
      return;
    }
    this.#datadogLogService.logInfo('EFR fiscal day not open (informational)', {
      countryCode,
      dialect: readout.source,
    });
  }

  #logFalseHealthyVerdict(
    readout: EfrStateObserved,
    result: EfrHealthCheckResult,
    policy: EfrHealthPolicy,
    countryCode: string | undefined,
  ): void {
    const deviceFaults = describeDeviceFaults(policy, readout.state);

    if (!result.healthy || deviceFaults.length === 0 || isAnySignalExplainedByATriggeredRule(policy, readout.state, deviceFaults)) {
      return;
    }

    const key = `false-healthy|${readout.source}|${deviceFaults.join(',')}`;
    if (!this.#logThrottle.tryAcquireLogSlot(key)) {
      return;
    }

    const { coverOpen, paperEnd, printerWork } = readout.state;
    this.#datadogLogService.logWarn('EFR health check passed with printer not working', {
      countryCode,
      coverOpen,
      dialect: readout.source,
      paperEnd,
      printerWork,
    });
  }

  #logFranceOutcome(
    outcome: FranceFiscalHealthOutcome,
    errorCode: EfrHealthErrorCode | null,
    countryCode: string | undefined,
    target: FiscalHealthTarget,
  ): void {
    const context = {
      cashRegisterId: target.cashRegisterId,
      countryCode,
      partnerId: target.partnerId,
      placeId: target.placeId,
    };
    if (outcome.kind === 'unexpected' && outcome.status === HttpStatusCode.NotFound) {
      this.#datadogLogService.logError('France fiscal health check did not find the cash register, sale allowed', {
        ...context,
        status: outcome.status,
      });
      return;
    }
    if (outcome.kind === 'unexpected') {
      this.#datadogLogService.logWarn('France fiscal health check returned an unexpected response, sale allowed', {
        ...context,
        status: outcome.status,
      });
      return;
    }
    if (errorCode === null) {
      return;
    }
    this.#datadogLogService.logError('France fiscal health check failed', {
      ...context,
      errorCode,
      reason: outcome.kind === 'misconfigured' ? outcome.reason : null,
      status: outcome.kind === 'serviceUnavailable' ? outcome.status : null,
    });
  }

  #resolveCause(cause: { readonly descriptionKey: string; readonly solutionKeys: readonly string[] }): EfrResolvedCause {
    return {
      description: this.#translateService.instant(cause.descriptionKey) as string,
      solutions: cause.solutionKeys.map(key => this.#translateService.instant(key) as string),
    };
  }

  #resolveError(code: EfrHealthErrorCode): EfrHealthError {
    const config: EfrHealthErrorConfig = EFR_HEALTH_ERROR_CONFIG[code];

    return {
      causes: config.causes.map(cause => this.#resolveCause(cause)),
      code,
      description: this.#translateService.instant(config.descriptionKey) as string,
      ...(config.retryable === false ? { retryable: false } : {}),
      title: this.#translateService.instant(config.titleKey) as string,
    };
  }

  #toErrorOrNull(code: EfrHealthErrorCode, excluded: readonly EfrHealthErrorCode[]): EfrHealthErrorCode | null {
    return excluded.includes(code) ? null : code;
  }

  #toFranceErrorCode(outcome: FranceFiscalHealthOutcome, excluded: readonly EfrHealthErrorCode[]): EfrHealthErrorCode | null {
    switch (outcome.kind) {
      case 'misconfigured':
        return this.#toErrorOrNull(EfrHealthErrorCode.FISCAL_MISCONFIGURED, excluded);
      case 'serviceUnavailable':
        return this.#toErrorOrNull(EfrHealthErrorCode.FISCAL_SERVICE_UNAVAILABLE, excluded);
      case 'healthy':
      case 'unexpected':
        return null;
    }
  }
}
