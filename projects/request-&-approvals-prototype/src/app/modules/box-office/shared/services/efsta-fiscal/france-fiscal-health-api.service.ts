import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { environment } from '@fz-original/environments/environment';
import { catchError, map, Observable, of } from 'rxjs';

import { FiscalHealthTarget } from './models/efr-health-check.model';
import { FranceFiscalHealthErrorBody, FranceFiscalHealthOutcome } from './models/france-fiscal-health.model';

/**
 * France uses the cloud EFSTA EFR, reachable only through partners (the credentials live there), so the
 * pre-payment check asks partners instead of the local EFR device used in HU/PL.
 */
@Injectable({
  providedIn: 'root',
})
export class FranceFiscalHealthApiService {
  readonly #http = inject(HttpClient);
  readonly #misconfiguredErrorCode = 'FISCAL_MISCONFIGURED';
  readonly #timeoutHeaders = new HttpHeaders({ timeout: '10000' });

  check(target: FiscalHealthTarget): Observable<FranceFiscalHealthOutcome> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${target.partnerId}/places/${target.placeId}/cash-registers/${target.cashRegisterId}/fiscal-health`;

    return this.#http
      .get(url, {
        context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true),
        headers: this.#timeoutHeaders,
      })
      .pipe(
        map((): FranceFiscalHealthOutcome => ({ kind: 'healthy' })),
        catchError((error: unknown) => of(this.#toOutcome(error))),
      );
  }

  #toOutcome(error: unknown): FranceFiscalHealthOutcome {
    if (!(error instanceof HttpErrorResponse)) {
      return { kind: 'serviceUnavailable', status: 0 };
    }
    const body = (error.error ?? null) as FranceFiscalHealthErrorBody | null;
    const code = body?.error?.code ?? body?.code;

    if (error.status === HttpStatusCode.Conflict && code === this.#misconfiguredErrorCode) {
      return { kind: 'misconfigured', reason: body?.data?.reason ?? null };
    }
    if (
      error.status === 0 ||
      error.status === HttpStatusCode.Unauthorized ||
      error.status === HttpStatusCode.Forbidden ||
      error.status >= HttpStatusCode.InternalServerError
    ) {
      return { kind: 'serviceUnavailable', status: error.status };
    }
    return { kind: 'unexpected', status: error.status };
  }
}
