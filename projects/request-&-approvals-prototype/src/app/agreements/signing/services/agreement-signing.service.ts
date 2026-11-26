import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SKIP_FORBIDDEN_TOAST } from '../../../shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '../../../shared/interceptors/skip-retry.token';
import { BaseResponse } from '../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { AgreementSignContext } from '../models/agreement-sign-context.model';
import { AgreementSigningError } from '../models/agreement-signing-error.model';
import { OrderAgreementSigner } from '../models/order-agreement-signer.model';
import { OrderAgreementAction, OrderAgreements } from '../models/order-agreements.model';
import { SignAgreementsPayload, SignAgreementsResult } from '../models/sign-agreements.model';
import { AgreementSignContextAdapter } from './adapters/agreement-sign-context.adapter';
import { IndividualAgreementAdapter } from './adapters/individual-agreement.adapter';
import { OrderAgreementSignerAdapter } from './adapters/order-agreement-signer.adapter';
import { AgreementSignContextDataDto } from './dtos/agreement-sign-context.dto';
import { OrderAgreementSignerDto, OrderAgreementSignersDataDto } from './dtos/order-agreement-signer.dto';
import { OrderAgreementsDataDto } from './dtos/order-agreements-data.dto';
import { SignAgreementsDataDto } from './dtos/sign-agreements.dto';

/**
 * A hung acceptance would otherwise leave the modal locked with no retry to settle it, and a hung
 * admin action or the reload that follows it would leave every row menu of the panel disabled, so
 * the sign request, the row actions and the listing carry the box office's own deadline, as the
 * fiscal transaction calls do.
 */
const agreementActionTimeoutMs = 30_000;

/**
 * fever2's partner agreements API - the same contract the B2C web consumes, behind partner
 * endpoints: the listing (POST-5254), sign-context (POST-5363) and sign (POST-5364), plus the
 * partner admin actions on a row (POST-5511): waive, recheck and reopen.
 */
@Injectable({ providedIn: 'root' })
export class AgreementSigningService {
  readonly #adapter = inject(IndividualAgreementAdapter);
  readonly #http = inject(HttpClient);
  readonly #signContextAdapter = inject(AgreementSignContextAdapter);
  readonly #signerAdapter = inject(OrderAgreementSignerAdapter);
  readonly #translate = inject(TranslateService);

  getSignContext(partnerId: number, individualAgreementIds: string[]): Observable<AgreementSignContext> {
    const url = this.#url(`${partnerId}/agreements/sign-context/`);
    // This payload is the legal text the participant is about to accept, so it matters more than
    // the listing's titles that it arrives in the language being read aloud at the counter.
    let params = this.#localeParams();
    for (const individualAgreementId of individualAgreementIds) {
      params = params.append('individual_agreement_ids', individualAgreementId);
    }
    // Same refusal as the listing's: the step reports a foreign order itself.
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);
    return this.#http.get<BaseResponse<AgreementSignContextDataDto>>(url, { context, params }).pipe(
      map(res => this.#signContextAdapter.signContextFromApi(this.#unwrap(res))),
      catchError(err => this.#rethrow(err)),
    );
  }

  listForOrder(partnerId: number, orderId: number): Observable<OrderAgreements> {
    const url = this.#url(`${partnerId}/orders/${orderId}/agreements/`);
    // A 403 here means the order belongs to another partner, which the step says in its own words.
    // The global forbidden toast would answer the same response with `errors.ACCESS_FORBIDDEN`, so
    // the operator would read two messages for one refusal, one of them the wrong advice.
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);
    // The panel keeps its row menus locked while a reload after an action is in flight, so a hung
    // listing must settle too. The GET stays retryable: each attempt gets its own deadline, and the
    // retry policy's bounded attempts bound the lock with them.
    const headers = new HttpHeaders({ timeout: String(agreementActionTimeoutMs) });
    return this.#http.get<BaseResponse<OrderAgreementsDataDto>>(url, { context, headers, params: this.#localeParams() }).pipe(
      map(res => this.#adapter.orderAgreementsFromApi(this.#unwrap(res))),
      catchError(err => this.#rethrow(err)),
    );
  }

  listSignersForOrder(partnerId: number, orderId: number): Observable<OrderAgreementSigner[]> {
    const url = this.#url(`${partnerId}/orders/${orderId}/agreements/signers/`);
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
    const headers = new HttpHeaders({ timeout: String(agreementActionTimeoutMs) });
    return this.#http.get<BaseResponse<OrderAgreementSignersDataDto>>(url, { context, headers }).pipe(
      map((res: BaseResponse<OrderAgreementSignersDataDto>) =>
        this.#unwrap(res).signers.map((signer: OrderAgreementSignerDto) => this.#signerAdapter.fromApi(signer)),
      ),
      catchError((err: unknown) => this.#rethrow(err)),
    );
  }

  recheck(partnerId: number, individualAgreementId: string): Observable<void> {
    return this.#postAction(partnerId, 'recheck', individualAgreementId);
  }

  /** fever2 reopens a signed row only when asked, so a row that turned signed after the listing is never reopened unconfirmed. */
  reopen(partnerId: number, individualAgreementId: string, isSignedIncluded: boolean = false): Observable<void> {
    return this.#postAction(partnerId, 'reopen', individualAgreementId, isSignedIncluded);
  }

  sign(partnerId: number, payload: SignAgreementsPayload): Observable<SignAgreementsResult> {
    const url = this.#url(`${partnerId}/agreements/sign/`);
    // Recording an acceptance is not idempotent: a replay of a request fever2 already committed
    // comes back as a conflict and reads to the operator as a failed signature.
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
    const headers = new HttpHeaders({ timeout: String(agreementActionTimeoutMs) });
    return this.#http
      .post<BaseResponse<SignAgreementsDataDto>>(url, this.#signContextAdapter.toSignRequestDto(payload), { context, headers })
      .pipe(
        map(res => this.#signContextAdapter.signResultFromApi(this.#unwrap(res))),
        catchError(err => this.#rethrow(err)),
      );
  }

  waive(partnerId: number, individualAgreementId: string): Observable<void> {
    return this.#postAction(partnerId, 'waive', individualAgreementId);
  }

  /**
   * fever2 resolves the agreement title against the requirement's own translations, keyed by the
   * locale the partner saved them under, and falls back to the plan's base locale when the key is
   * absent. Sending the operator's language can only improve on that fallback.
   */
  #localeParams(): HttpParams {
    const locale = this.#translate.currentLang;
    return locale == null || locale.length === 0 ? new HttpParams() : new HttpParams().set('locale', locale);
  }

  /**
   * A replayed waive answers 404 and a replayed reopen 409, which would read to the operator as a
   * failure of the request that already landed. A retried recheck would stack a fresh deadline per
   * attempt and keep the panel locked for minutes, so no action is retried: the operator can pick it
   * again. The panel reports a refusal in its own words, as the listing does.
   */
  #postAction(
    partnerId: number,
    action: OrderAgreementAction,
    individualAgreementId: string,
    isSignedIncluded: boolean = false,
  ): Observable<void> {
    const url = this.#url(`${partnerId}/agreements/${action}/`);
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
    const headers = new HttpHeaders({ timeout: String(agreementActionTimeoutMs) });
    const body = { individual_agreement_ids: [individualAgreementId], ...(isSignedIncluded ? { include_signed: true } : {}) };
    return this.#http.post<void>(url, body, { context, headers }).pipe(catchError(err => this.#rethrow(err)));
  }

  #rethrow(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const error: AgreementSigningError = { ...ErrorResponseUtils.getErrorResponseError(err), status: err.status };
      return throwError(() => error);
    }
    // A 200 whose envelope carries an error already speaks the caller's language: pass it through
    // rather than burying its code and message under a generic one.
    if (this.#isEnvelopeError(err)) {
      return throwError(() => err);
    }
    const message = err instanceof Error ? err.message : 'errors.generic';
    const error: AgreementSigningError = { code: 'UNKNOWN_ERROR', error: err, message, status: null };
    return throwError(() => error);
  }

  #isEnvelopeError(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
  }

  #unwrap<T>(res: BaseResponse<T>): T {
    const data = res.data;
    if (data == null) {
      throw res.error ?? { code: 'UNKNOWN_ERROR', message: 'errors.generic' };
    }
    return data;
  }

  #url(path: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${path}`;
  }
}
