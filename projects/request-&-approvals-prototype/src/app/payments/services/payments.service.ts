import { HttpClient, HttpContext, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

import { CartPaymentCheckoutError } from '../models/cart-payment-checkout-error.model';
import { CartPaymentTriggerError } from '../models/cart-payment-trigger-error.model';
import { ChargeInProgressError } from '../models/charge-in-progress-error.model';
import type {
  CancelPaymentResponseDto,
  ConfirmPaymentRequestDto,
  ConfirmPaymentResponseDto,
  CreateCartPaymentResponseDto,
  CreateTapToPaySessionRequestDto,
  PaymentsStatusDto,
  TapToPaySessionResponseDto,
} from '../models/payments.dto';
import type {
  CancelPaymentParams,
  CancelPaymentResponse,
  ConfirmPaymentParams,
  ConfirmPaymentResponse,
  CreateCartPaymentParams,
  CreateCartPaymentResponse,
  CreateTapToPaySessionParams,
  GetPaymentsStatusParams,
  PaymentsStatus,
} from '../models/payments.model';
import {
  CHARGE_IN_PROGRESS_ERROR_CODE,
  PURCHASE_ALREADY_CONFIRMED_ERROR_CODE,
  SESSION_HAS_PAYMENTS_ERROR_CODE,
} from '../models/payments.model';
import { PurchaseAlreadyConfirmedError } from '../models/purchase-already-confirmed-error.model';
import { SessionHasPaymentsError } from '../models/session-has-payments-error.model';
import type { TapToPaySession } from '../models/tap-to-pay.model';
import {
  fromCancelResponseDto,
  fromConfirmResponseDto,
  fromCreateCartPaymentResponseDto,
  fromStatusDto,
  fromTapToPaySessionResponseDto,
  getCartPaymentErrorPaidAmount,
  getCartPaymentErrorSession,
  getCheckoutErrorCode,
  getTriggerErrorCode,
  getTriggerErrorFailureCategory,
  toCreateCartPaymentRequestDto,
  toTapToPaySessionError,
} from './payments.adapter';

/** Matches the terminal timeout applied to legacy Adyen-driven calls. */
const TERMINAL_CALL_TIMEOUT_MS = 120_000;

const TAP_TO_PAY_SESSION_TIMEOUT_MS = 25_000;

/**
 * The trigger is not idempotent: a replay re-sends the payment to the device, and a 5xx such as an
 * unreachable terminal must reach the failure screen at once rather than after the retry
 * interceptor's back-off.
 */
function buildTriggerCallContext(): HttpContext {
  return new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
}

function toTriggerError(error: unknown): unknown {
  if (getTriggerErrorCode(error) === CHARGE_IN_PROGRESS_ERROR_CODE) {
    return new ChargeInProgressError();
  }
  // A classified rejection travels as its category so the failure screen can name the cause.
  const failureCategory = getTriggerErrorFailureCategory(error);
  return failureCategory !== undefined ? new Error(failureCategory) : ErrorResponseUtils.getErrorResponseError(error);
}

function isCheckoutStepRefusal(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status !== 0 &&
    error.status !== HttpStatusCode.GatewayTimeout &&
    typeof error.error === 'object' &&
    error.error !== null &&
    !Array.isArray(error.error)
  );
}

function toSessionOpeningError(error: unknown): unknown {
  const session = getCartPaymentErrorSession(error);
  if (session === null) {
    if (getCheckoutErrorCode(error) === PURCHASE_ALREADY_CONFIRMED_ERROR_CODE) {
      return new PurchaseAlreadyConfirmedError(error);
    }
    return isCheckoutStepRefusal(error) ? new CartPaymentCheckoutError(error) : toTriggerError(error);
  }
  if (getTriggerErrorCode(error) === SESSION_HAS_PAYMENTS_ERROR_CODE) {
    return new SessionHasPaymentsError(session, getCartPaymentErrorPaidAmount(error));
  }
  return new CartPaymentTriggerError(session, toTriggerError(error));
}

/**
 * Dedicated, framework-independent HTTP client for the payments backend endpoints. A single
 * payment is driven as a "split of 1" through the same endpoints, so this service is the single
 * seam that any consumer (checkout, ...) talks to for triggering, polling and cancelling payments.
 *
 * This domain deliberately depends on nothing feature-specific (no box-office, no checkout) so it
 * can be reused by any module and, in the future, extracted into its own library.
 */
@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  readonly #http = inject(HttpClient);

  cancelPayment({ cartId, childTransactionId, partnerId, skipRetry }: CancelPaymentParams): Observable<CancelPaymentResponse> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${childTransactionId}/cancel`;
    const context = skipRetry === true ? buildTriggerCallContext() : new HttpContext();
    return this.#http.post<CancelPaymentResponseDto>(url, {}, { context }).pipe(
      timeout(TERMINAL_CALL_TIMEOUT_MS),
      map(fromCancelResponseDto),
      catchError((error: unknown) => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  confirmPayment({
    authorizedAmount,
    cartId,
    chargeId,
    currency,
    errorCondition,
    outcome,
    partnerId,
    pspReference,
    refusalReason,
  }: ConfirmPaymentParams): Observable<ConfirmPaymentResponse> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${chargeId}/confirm`;
    const body: ConfirmPaymentRequestDto = {
      outcome,
      ...(authorizedAmount != null && { authorized_amount: authorizedAmount }),
      ...(currency != null && { currency }),
      ...(pspReference != null && { psp_reference: pspReference }),
      ...(errorCondition != null && { error_condition: errorCondition }),
      ...(refusalReason != null && { refusal_reason: refusalReason }),
    };
    return this.#http.post<ConfirmPaymentResponseDto>(url, body, { context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true) }).pipe(
      timeout(TERMINAL_CALL_TIMEOUT_MS),
      map(fromConfirmResponseDto),
      catchError((error: unknown) => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  createCartPayment(params: CreateCartPaymentParams): Observable<CreateCartPaymentResponse> {
    const url = `${this.#buildBaseUrl(params.partnerId, params.cartId)}/payments`;
    return this.#http
      .post<CreateCartPaymentResponseDto>(url, toCreateCartPaymentRequestDto(params), { context: buildTriggerCallContext() })
      .pipe(
        timeout(TERMINAL_CALL_TIMEOUT_MS),
        map(fromCreateCartPaymentResponseDto),
        catchError((error: unknown) => throwError(() => (params.sessionId != null ? toTriggerError(error) : toSessionOpeningError(error)))),
      );
  }

  createTapToPaySession({ partnerId, paymentConfigurationId, setupToken }: CreateTapToPaySessionParams): Observable<TapToPaySession> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/tap-to-pay/sessions`;
    const body: CreateTapToPaySessionRequestDto = { payment_configuration_id: paymentConfigurationId, setup_token: setupToken };
    return this.#http.post<TapToPaySessionResponseDto>(url, body, { context: buildTriggerCallContext() }).pipe(
      timeout(TAP_TO_PAY_SESSION_TIMEOUT_MS),
      map(fromTapToPaySessionResponseDto),
      catchError((error: unknown) => throwError(() => toTapToPaySessionError(error))),
    );
  }

  getPaymentsStatus({ cartId, parentTransactionId, partnerId }: GetPaymentsStatusParams): Observable<PaymentsStatus> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${parentTransactionId}`;
    return this.#http.get<PaymentsStatusDto>(url).pipe(
      map(fromStatusDto),
      catchError((error: unknown) => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #buildBaseUrl(partnerId: number, cartId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/carts/${cartId}`;
  }
}
