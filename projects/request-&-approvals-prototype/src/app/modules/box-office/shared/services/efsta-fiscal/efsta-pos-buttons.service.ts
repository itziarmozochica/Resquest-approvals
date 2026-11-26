import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { catchError, Observable, tap, throwError, timeout } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { buildComplianceLog, ComplianceLogContext, ComplianceSubprocess } from './models/compliance-log.model';

const EFR_TIMEOUT_MS = 30_000;

@Injectable({
  providedIn: 'root',
})
export class EfstaPosButtonsService {
  #http = inject(HttpClient);
  #datadogLogService = inject(DatadogLogService);

  disableUsbMode(logContext?: ComplianceLogContext): Observable<unknown> {
    return this.#sendPeriRequest('/peri/print/usb-mode?enable=0&RN=def', 'disableUsbMode', 'usb-off', logContext);
  }

  enableUsbMode(logContext?: ComplianceLogContext): Observable<unknown> {
    return this.#sendPeriRequest('/peri/print/usb-mode?enable=1&RN=def', 'enableUsbMode', 'usb-on', logContext);
  }

  pingNavServer(logContext?: ComplianceLogContext): Observable<unknown> {
    return this.#sendPeriRequest('/peri/print/ping?RN=def', 'pingNavServer', 'ping-nav', logContext);
  }

  printDocumentList(zIndex: string, logContext?: ComplianceLogContext): Observable<unknown> {
    return this.#sendPeriRequest(`/peri/print/list?ZI=${encodeURIComponent(zIndex)}&RN=def`, 'printDocumentList', 'print-list', logContext);
  }

  #sendPeriRequest(path: string, action: string, subprocess: ComplianceSubprocess, logContext?: ComplianceLogContext): Observable<unknown> {
    const startTime = performance.now();
    const url = `${environment.efstaEfrBaseUrl}${path}`;

    return this.#http.post(url, null).pipe(
      timeout(EFR_TIMEOUT_MS),
      tap(() => {
        const durationMs = Math.round(performance.now() - startTime);
        this.#datadogLogService.logInfo(`EFSTA POS ${action} completed`, buildComplianceLog(subprocess, logContext ?? {}, { durationMs }));
      }),
      catchError((error: unknown) => {
        const durationMs = Math.round(performance.now() - startTime);
        const httpStatus = error instanceof HttpErrorResponse ? error.status : undefined;
        const errorMessage = error instanceof HttpErrorResponse ? error.message : String(error);
        this.#datadogLogService.logWarn(
          `EFSTA POS ${action} failed`,
          buildComplianceLog(subprocess, logContext ?? {}, {
            details: errorMessage,
            durationMs,
            errorCode: `EFR_POS_${action.toUpperCase()}_FAILED`,
            httpStatus,
          }),
        );
        return throwError(() => error);
      }),
    );
  }
}
