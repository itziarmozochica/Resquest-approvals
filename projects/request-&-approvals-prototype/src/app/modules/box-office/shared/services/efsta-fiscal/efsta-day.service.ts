import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { environment } from '@fz-original/environments/environment';
import { catchError, Observable, of, tap, timeout } from 'rxjs';

import { parseEsrZReport } from './efsta-z-report.util';
import { buildComplianceLog, ComplianceLogData, ComplianceSubprocess } from './models/compliance-log.model';
import { EsrRegisterResponse } from './models/efsta-esr-response.model';
import { EsrRequest } from './models/efsta-esr.model';
import { EfstaZReport } from './models/efsta-z-report.model';

const EFR_TIMEOUT_MS = 30_000;

@Injectable({
  providedIn: 'root',
})
export class EfstaDayService {
  #http = inject(HttpClient);
  #datadogLogService = inject(DatadogLogService);

  closeDay(placeId?: string, logContext?: Partial<ComplianceLogData>): Observable<EsrRegisterResponse | null> {
    return this.#sendDayRequest('Z', 'close', placeId, undefined, logContext);
  }

  login(placeId: string, operatorId: string, operatorName: string): Observable<EsrRegisterResponse | null> {
    return this.#sendOperatorRequest('LOGIN', 'login', placeId, operatorId, operatorName);
  }

  logout(placeId: string, operatorId: string, operatorName: string): Observable<EsrRegisterResponse | null> {
    return this.#sendOperatorRequest('LOGOUT', 'logout', placeId, operatorId, operatorName);
  }

  openDay(placeId?: string, initialAmount?: number, logContext?: Partial<ComplianceLogData>): Observable<EsrRegisterResponse | null> {
    return this.#sendDayRequest('INI', 'open', placeId, initialAmount, logContext);
  }

  xReport(placeId?: string, logContext?: Partial<ComplianceLogData>): Observable<EsrRegisterResponse | null> {
    return this.#sendDayRequest('X', 'x-report', placeId, undefined, logContext);
  }

  #resolveZReport(
    response: EsrRegisterResponse,
    nfsValue: string,
    action: string,
    subprocess: ComplianceSubprocess,
    logContext?: Partial<ComplianceLogData>,
  ): EfstaZReport | null {
    const zBlock = response.TraC?.Z;
    if (zBlock == null) {
      return null;
    }

    if (nfsValue !== 'Z') {
      this.#datadogLogService.logWarn(
        `EFSTA fiscal day ${action} returned an unexpected Z block`,
        buildComplianceLog(subprocess, logContext ?? {}, {
          errorCode: 'EFR_Z_REPORT_UNEXPECTED',
        }),
      );
      return null;
    }

    const parseResult = parseEsrZReport(zBlock);
    if (parseResult.status === 'invalid') {
      this.#datadogLogService.logError(
        `EFSTA fiscal day ${action} returned an unreadable Z block`,
        buildComplianceLog(subprocess, logContext ?? {}, {
          details: parseResult.reason,
          errorCode: 'EFR_Z_REPORT_UNREADABLE',
        }),
      );
      return null;
    }

    return parseResult.report;
  }

  #sendDayRequest(
    nfsValue: string,
    action: string,
    placeId?: string,
    amount?: number,
    logContext?: Partial<ComplianceLogData>,
  ): Observable<EsrRegisterResponse | null> {
    const startTime = performance.now();
    const formattedAmount = (amount ?? 0).toFixed(2);
    const request: EsrRequest = {
      Tra: {
        ESR: {
          D: new Date().toISOString(),
          NFS: nfsValue,
          PayA: nfsValue === 'INI' ? [{ _: 'Pay', Amt: formattedAmount, Dsc: 'Cash', PayG: 'cash' }] : undefined,
          T: formattedAmount,
          TL: placeId ?? '',
        },
      },
    };

    const url = `${environment.efstaEfrBaseUrl}/register`;

    return this.#http.post<EsrRegisterResponse>(url, JSON.stringify(request), { headers: { 'Content-Type': 'text/plain' } }).pipe(
      timeout(EFR_TIMEOUT_MS),
      tap((response: EsrRegisterResponse) => {
        const durationMs = Math.round(performance.now() - startTime);
        const subprocess = nfsValue === 'Z' ? 'z-report' : nfsValue === 'X' ? 'x-report' : 'open-day';
        const zReport = this.#resolveZReport(response, nfsValue, action, subprocess, logContext);
        this.#datadogLogService.logInfo(
          `EFSTA fiscal day ${action} completed`,
          buildComplianceLog(subprocess, logContext ?? {}, {
            durationMs,
            efrResponseCode: response.TraC?.Result?.RC,
            ...(zReport === null ? {} : { zReport }),
          }),
        );
      }),
      catchError((error: unknown) => {
        const durationMs = Math.round(performance.now() - startTime);
        const errorMessage = (error as { message?: string })?.message ?? String(error);
        const subprocess = nfsValue === 'Z' ? 'z-report' : nfsValue === 'X' ? 'x-report' : 'open-day';

        this.#datadogLogService.logWarn(
          `EFSTA fiscal day ${action} failed`,
          buildComplianceLog(subprocess, logContext ?? {}, {
            details: errorMessage,
            durationMs,
            errorCode: `EFR_DAY_${action.toUpperCase()}_FAILED`,
          }),
        );

        return of(null);
      }),
    );
  }

  #sendOperatorRequest(
    nfsValue: string,
    action: string,
    placeId: string,
    operatorId: string,
    operatorName: string,
  ): Observable<EsrRegisterResponse | null> {
    const startTime = performance.now();
    const request: EsrRequest = {
      Tra: {
        ESR: {
          D: new Date().toISOString(),
          TL: placeId,
          TT: '1',
          NFS: nfsValue,
          Opr: operatorId,
          OprN: operatorName,
        },
      },
    };

    const url = `${environment.efstaEfrBaseUrl}/register`;

    return this.#http.post<EsrRegisterResponse>(url, JSON.stringify(request), { headers: { 'Content-Type': 'text/plain' } }).pipe(
      timeout(EFR_TIMEOUT_MS),
      tap((response: EsrRegisterResponse) => {
        const durationMs = Math.round(performance.now() - startTime);
        this.#datadogLogService.logInfo(`EFSTA fiscal ${action} completed`, {
          action,
          nfsValue,
          operatorId,
          responseCode: response.TraC?.Result?.RC,
          durationMs,
        });
      }),
      catchError((error: unknown) => {
        const durationMs = Math.round(performance.now() - startTime);
        const errorMessage = (error as { message?: string })?.message ?? String(error);

        this.#datadogLogService.logError(`EFSTA fiscal ${action} failed`, {
          action,
          nfsValue,
          operatorId,
          errorMessage,
          durationMs,
        });

        return of(null);
      }),
    );
  }
}
