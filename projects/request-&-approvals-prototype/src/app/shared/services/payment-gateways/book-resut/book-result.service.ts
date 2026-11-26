import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCheckout } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { RazorpayCheckout } from '@fz-original/app/app/models/payment-checkout-razorpay.model';
import { SquareCheckout, SquareCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-square.model';
import { PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';
import {
  BookResultParams,
  QueryParamBookResult,
} from '@fz-original/app/shared/services/payment-gateways/book-resut/models/book-result-params.model';
import { defer, merge, Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../models/base-response';
import { Cart } from '../../../models/cart/cart.model';
import { CheckoutLoggerService } from '../../checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '../../checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '../../checkout-logger/models/checkout-stage.enum';
import { DistributorRouteService, scopedOrganizationHeader } from '../../distributor/distributor-route.service';
import { BookResultAdapter } from './book-result.adapter';
import { BookResultErrorContext, CheckoutResultPollingService } from './checkout-result-polling.service';
import { BookResult, BookResultResponse, BookStatusEnum } from './models/book-result-status.model';

export interface BookResultPollingOptions {
  maxRetryAttempts?: number;
  retryDelayMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookResultService {
  static readonly maxRetryAttemptsForBookingResult = 180;
  static readonly maxRetryAttemptsForSplitPaymentBookResult = 300;
  static readonly retryTimeInMs = 1000;
  static readonly retryTimeInMsForSplitPaymentBookResult = 1500;

  #bookResultAdapter = inject(BookResultAdapter);
  #checkoutLogger = inject(CheckoutLoggerService);
  #checkoutResultPolling = inject(CheckoutResultPollingService);
  readonly #distributorRoute = inject(DistributorRouteService);
  #http = inject(HttpClient);
  #maxRetryAttemptsForBookingResult = BookResultService.maxRetryAttemptsForBookingResult;
  #retryTimeInMs = BookResultService.retryTimeInMs;

  getBookResult(
    paymentGateway: PaymentCheckoutET,
    partnerId: number,
    planId: number,
    placeId: number,
    cart: Cart,
    checkoutResponse: AdyenCheckout | SquareCheckout | SquareCreateCheckoutBody | unknown | null,
    userId?: number,
    restartTrigger$?: Observable<void>,
    pollingOptions?: BookResultPollingOptions,
  ): Observable<BaseResponse<BookResult>> {
    this.#checkoutLogger.info(
      'Start requesting book result',
      this.#getCheckoutLoggerContext(cart, {
        paymentGateway,
      }),
      { cartId: cart.id },
    );

    const queryParam = this.#getQueryParamBookResult(paymentGateway, partnerId, planId, placeId, cart, checkoutResponse, userId);
    const resultUrl = this.#getBookResultUrl(partnerId, planId, placeId, cart.id ?? '');

    if (!restartTrigger$) {
      return this.#createPollingObservable(cart, resultUrl, queryParam, pollingOptions);
    }

    return merge(of(void 0), restartTrigger$).pipe(
      switchMap(() => this.#createPollingObservable(cart, resultUrl, queryParam, pollingOptions)),
      take(1),
    );
  }

  getBookResultOnce(
    paymentGateway: PaymentCheckoutET,
    partnerId: number,
    planId: number,
    placeId: number,
    cart: Cart,
    checkoutResponse: AdyenCheckout | SquareCheckout | SquareCreateCheckoutBody | unknown | null,
    userId?: number,
  ): Observable<BaseResponse<BookResult>> {
    const queryParam = this.#getQueryParamBookResult(paymentGateway, partnerId, planId, placeId, cart, checkoutResponse, userId);
    const resultUrl = this.#getBookResultUrl(partnerId, planId, placeId, cart.id ?? '');

    return this.#getBookResultStatus(cart, resultUrl, queryParam);
  }

  #createPollingObservable(
    cart: Cart,
    resultUrl: string,
    queryParam: QueryParamBookResult,
    pollingOptions?: BookResultPollingOptions,
  ): Observable<BaseResponse<BookResult>> {
    const maxRetryAttempts = pollingOptions?.maxRetryAttempts ?? this.#maxRetryAttemptsForBookingResult;
    const retryDelayMs = pollingOptions?.retryDelayMs ?? this.#retryTimeInMs;
    const pollingStartedAtMs = Date.now();
    let pollAttempts = 0;
    const pollAttempt$ = defer(() => {
      pollAttempts += 1;
      return this.#getBookResultStatus(cart, resultUrl, queryParam, {
        attempts: pollAttempts,
        elapsedMsSincePurchase: Date.now() - pollingStartedAtMs,
      });
    });

    return this.#checkoutResultPolling.runPollingUntilSettled$(cart, pollAttempt$, {
      inProgressLogMessage: 'BookResult in progress',
      maxRetryAttempts,
      retryDelayMs,
      getCheckoutLogContext: (c, data) => this.#getCheckoutLoggerContext(c, data),
      normalizeAttempt: response => {
        const result = response as BaseResponse<BookResult>;
        if (result.data?.status !== BookStatusEnum.Completed) {
          throw result;
        }
        return result;
      },
    });
  }

  #getBookResultParams(queryParam: QueryParamBookResult): BookResultParams {
    let bookResulParams: BookResultParams = {
      paymentGateway: queryParam.paymentGateway,
      userId: queryParam.userId,
    };
    bookResulParams = queryParam.deviceId ? { ...bookResulParams, deviceId: queryParam.deviceId } : bookResulParams;
    bookResulParams = queryParam.transactionId
      ? {
          ...bookResulParams,
          transactionId: queryParam.transactionId,
        }
      : bookResulParams;
    bookResulParams = queryParam.idempotencyKey
      ? {
          ...bookResulParams,
          idempotencyKey: queryParam.idempotencyKey,
        }
      : bookResulParams;
    return bookResulParams;
  }

  #getBookResultStatus(
    cart: Cart,
    resultUrl: string,
    queryParam: QueryParamBookResult,
    pollingMetrics?: Pick<BookResultErrorContext, 'attempts' | 'elapsedMsSincePurchase'>,
  ): Observable<BaseResponse<BookResult>> {
    const params: BookResultParams = this.#getBookResultParams(queryParam);
    const queryParams: HttpParams = this.#getParameters(params);

    return this.#http
      .get<BookResultResponse>(resultUrl, { headers: this.#scopedOrganizationHeaders(), observe: 'response', params: queryParams })
      .pipe(
        map(response => {
          const responseAdapted = this.#bookResultAdapter.fromApi(response.body!);
          if (responseAdapted.data !== null && params.transactionId !== undefined) {
            responseAdapted.data.transactionId = params.transactionId;
          }
          return responseAdapted;
        }),
        catchError((error: HttpErrorResponse) =>
          this.#checkoutResultPolling.onHttpGetPollingError$(cart, error, {
            getCheckoutLogContext: (c, data) => this.#getCheckoutLoggerContext(c, data),
            getInProgressResponse: () => this.#bookResultAdapter.getInProgressResponse(),
            bookResultErrorContext: {
              partnerId: queryParam.partnerId,
              planId: queryParam.planId,
              placeId: queryParam.placeId,
              deviceId: params.deviceId,
              transactionId: params.transactionId,
              paymentGateway: queryParam.paymentGateway || 'unknown',
              attempts: pollingMetrics?.attempts,
              elapsedMsSincePurchase: pollingMetrics?.elapsedMsSincePurchase,
            } satisfies BookResultErrorContext,
          }),
        ),
      );
  }

  #getBookResultUrl(partnerId: number, planId: number, placeId: number, cartId: string): string {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return `${environment.apiGWBaseUrl}/2.0/partners/${target.targetOrganizationId}/plans/${planId}/places/${placeId}/carts/${cartId}/book-result`;
    }
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/places/${placeId}/carts/${cartId}/book-result`;
  }

  #getCheckoutLoggerContext(cart: Cart, data?: Record<string, unknown> | null): CheckoutLogContext {
    return {
      cartId: cart.id,
      data,
      stage: CheckoutStageEnum.REQUESTING_BOOK_RESULT,
    };
  }

  #getParameters(params: BookResultParams): HttpParams {
    const queryDTO = this.#bookResultAdapter.toApi(params);
    return Object.entries(queryDTO)
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((httpParams, [key, value]) => httpParams.append(key, value), new HttpParams());
  }

  #getQueryParamBookResult(
    paymentGateway: PaymentCheckoutET,
    partnerId: number,
    planId: number,
    placeId: number,
    cart: Cart,
    checkoutResponse?: AdyenCheckout | SquareCheckout | SquareCreateCheckoutBody | unknown | null,
    userId?: number,
  ): QueryParamBookResult {
    let queryParamBookResult: QueryParamBookResult = {
      cartId: cart.id ?? '',
      partnerId: partnerId,
      paymentGateway: (cart.total?.amount ?? 0) > 0 ? paymentGateway : (PaymentCheckout[PaymentCheckout.free] as PaymentCheckoutET),
      placeId: placeId,
      planId: planId,
      userId: cart.userId ?? userId ?? 0,
    };

    if (checkoutResponse != null && typeof checkoutResponse === 'object') {
      if ('deviceId' in checkoutResponse && (checkoutResponse as AdyenCheckout | SquareCreateCheckoutBody).deviceId) {
        queryParamBookResult = {
          ...queryParamBookResult,
          deviceId: (checkoutResponse as AdyenCheckout | SquareCreateCheckoutBody).deviceId,
        };
      }

      if (
        'transactionId' in checkoutResponse &&
        (checkoutResponse as AdyenCheckout | PaymentCheckoutTransaction | RazorpayCheckout).transactionId
      ) {
        queryParamBookResult = {
          ...queryParamBookResult,
          transactionId: (checkoutResponse as AdyenCheckout | PaymentCheckoutTransaction | RazorpayCheckout).transactionId,
        };
      }

      if ('idempotencyKey' in checkoutResponse && (checkoutResponse as SquareCheckout | SquareCreateCheckoutBody).idempotencyKey) {
        queryParamBookResult = {
          ...queryParamBookResult,
          idempotencyKey: (checkoutResponse as SquareCheckout | SquareCreateCheckoutBody).idempotencyKey,
        };
      }
    }

    return queryParamBookResult;
  }

  #scopedOrganizationHeaders(): HttpHeaders {
    const target = this.#distributorRoute.pairTarget();
    return new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
  }
}
