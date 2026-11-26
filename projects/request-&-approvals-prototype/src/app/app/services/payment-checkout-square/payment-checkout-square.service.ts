import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import {
  CreateSquarePairingCode,
  PairingStatus,
  SquareCheckout,
  SquareCreateCheckoutBody,
  SquarePairingCode,
  SquarePairingCodeResponse,
  SquarePairingStatusResponse,
} from '@fz-original/app/app/models/payment-checkout-square.model';
import { PaymentCheckoutTransaction, PaymentCheckoutTransactionData } from '@fz-original/app/app/models/payment.model';
import { SquareCreateCheckoutAsyncAdapter } from '@fz-original/app/app/services/payment-checkout-square/square-create-checkout-async.adapter';
import { SquareCreatePairingCodeAdapter } from '@fz-original/app/app/services/payment-checkout-square/square-create-pairing-code.adapter';
import { SquareGetPairingCodeAdapter } from '@fz-original/app/app/services/payment-checkout-square/square-get-pairing-code.adapter';
import { SquarePairingStatusAdapter } from '@fz-original/app/app/services/payment-checkout-square/square-pairing-status.adapter';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { catchError, map, mergeMap, Observable, throwError, timer } from 'rxjs';
import { retryWhen } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutSquareService {
  static readonly idempotencyKeyAsyncPrefix = 'fe85c7b7';
  static readonly maxRetryAttemptsForPairing = 120;
  static readonly retryTimeInMs = 1000;
  #checkoutLoggerService = inject(CheckoutLoggerService);
  #http = inject(HttpClient);
  #squareCreateCheckoutAsyncAdapter = inject(SquareCreateCheckoutAsyncAdapter);
  #squareCreatePairingCodeAdapter = inject(SquareCreatePairingCodeAdapter);
  #squareGetPairingCodeAdapter = inject(SquareGetPairingCodeAdapter);
  #squarePairingStatusAdapter = inject(SquarePairingStatusAdapter);

  cancel(currency: string, transactionId: string, url: string): Observable<undefined> {
    return this.#http.post(url, { currency, transaction_id: transactionId }).pipe(
      map((): undefined => undefined),
      catchError((error: HttpErrorResponse) => throwError(() => this.#toCancelError(error))),
    );
  }

  #toCancelError(error: HttpErrorResponse): BaseResponse<null> {
    const cancelError = ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.square] as PaymentCheckoutET);
    if (error.status === HttpStatusCode.Conflict && cancelError.error != null) {
      // 409 = the checkout was already completed on the terminal (customer charged), so it can no longer be cancelled
      cancelError.error.message = 'errors.square.paymentAlreadyCompleted';
    }
    return cancelError;
  }

  checkoutAsync(url: string, userId: number, checkout: SquareCreateCheckoutBody): Observable<SquareCheckout> {
    return this.#createCheckout(url, userId, checkout).pipe(
      map((response: BaseResponse<PaymentCheckoutTransaction>) => ({
        transactionId: (response.data as PaymentCheckoutTransaction).transactionId,
        idempotencyKey: checkout.idempotencyKey,
      })),
    );
  }

  #createCheckout(url: string, userId: number, request: SquareCreateCheckoutBody): Observable<BaseResponse<PaymentCheckoutTransaction>> {
    return this.#http.post<PaymentCheckoutTransactionData>(url, this.#squareCreateCheckoutAsyncAdapter.toApi(request, userId)).pipe(
      map(response => this.#squareCreateCheckoutAsyncAdapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  pairingCode(partnerId: number, params: CreateSquarePairingCode): Observable<BaseResponse<SquarePairingCode | null>> {
    return this.#createPairingCode(partnerId, params).pipe(
      mergeMap(() => this.#getPairingCode(partnerId, params.idempotencyKey)),
      catchError(error => ErrorResponseUtils.getErrorResponse<SquarePairingCode>(error)),
    );
  }

  pairingStatus(partnerId: number, codeId: string): Observable<BaseResponse<PairingStatus>> {
    return this.#getPairingStatus(partnerId, codeId).pipe(
      map(result => {
        if (!result?.data?.externalId) {
          throw result;
        }
        return result;
      }),
      retryWhen(
        this.#retryRequest(
          PaymentCheckoutSquareService.retryTimeInMs,
          PaymentCheckoutSquareService.maxRetryAttemptsForPairing,
          this.#isPairingFatalError,
        ),
      ),
    );
  }

  #createPairingCode(partnerId: number, body: CreateSquarePairingCode): Observable<BaseResponse<void>> {
    return this.#http
      .post<BaseResponse<void>>(this.#getPairingCodeUrl(partnerId), this.#squareCreatePairingCodeAdapter.toApi(body))
      .pipe(map(response => this.#squareCreatePairingCodeAdapter.fromApi(response)));
  }

  #getCheckoutLoggerContext(cartId: string, data?: Record<string, unknown>): CheckoutLogContext {
    return {
      stage: CheckoutStageEnum.CHECKOUT,
      cartId: cartId,
      data,
    };
  }

  #getPairingCode(partnerId: number, idempotencyKey: string): Observable<BaseResponse<SquarePairingCode>> {
    return this.#http
      .get<BaseResponse<SquarePairingCodeResponse>>(this.#getPairingCodeUrl(partnerId, idempotencyKey))
      .pipe(map(response => this.#squareGetPairingCodeAdapter.fromApi(response)));
  }

  #getPairingCodeUrl(partnerId: number, idempotencyKey?: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/terminal-pairing-intent` + (idempotencyKey ? `/${idempotencyKey}` : '');
  }

  #getPairingStatus(partnerId: number, codeId: string): Observable<BaseResponse<PairingStatus>> {
    return this.#http.get<BaseResponse<SquarePairingStatusResponse>>(this.#getPairingStatusUrl(partnerId, codeId)).pipe(
      map(response => this.#squarePairingStatusAdapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #getPairingStatusUrl(partnerId: number, codeId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/terminal/${codeId}`;
  }

  #isPairingFatalError(error: BaseErrorResponse | BaseResponse<PairingStatus>): boolean {
    return 'code' in error;
  }

  #retryRequest<T>(retryTimeInMs: number, maxRetryAttempts: number, isFatalError: (error: T) => boolean, cartId?: string) {
    return (attempts: Observable<T>): Observable<number> => {
      return attempts.pipe(
        mergeMap((error, i) => {
          const retryAttempt = i + 1;
          if (retryAttempt > maxRetryAttempts || isFatalError(error)) {
            return throwError(() => error);
          }
          return timer(retryTimeInMs);
        }),
        catchError(err => {
          if (cartId) {
            this.#checkoutLoggerService.error(
              'Error on retry square',
              this.#getCheckoutLoggerContext(cartId, {
                error: JSON.stringify(err),
              }),
              { cartId: cartId, error: err },
            );
          }
          return throwError(() => err);
        }),
      );
    };
  }
}
