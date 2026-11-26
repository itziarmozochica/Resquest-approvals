import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import {
  DepositPaymentResult,
  DepositPaymentResultResponse,
  isDepositPaymentStatusCompleted,
  isDepositPaymentStatusTerminalFailure,
} from '@fz-original/app/modules/reservation/models/deposit-payment-result.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { DistributorRouteService, scopedOrganizationHeader } from '@fz-original/app/shared/services/distributor/distributor-route.service';
import { CheckoutResultPollingService } from '@fz-original/app/shared/services/payment-gateways/book-resut/checkout-result-polling.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { environment } from '@fz-original/environments/environment';
import type { DistributorTarget } from '@fz/reservations';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { DepositPaymentResultAdapter } from './deposit-payment-result.adapter';

const MAX_RETRY_ATTEMPTS = 10;
const RETRY_TIME_MS = 1000;

@Injectable({
  providedIn: 'root',
})
export class DepositPaymentResultService {
  static readonly maxRetryAttemptsForDepositPaymentResult = MAX_RETRY_ATTEMPTS;
  readonly #checkoutLogger = inject(CheckoutLoggerService);
  readonly #checkoutResultPolling = inject(CheckoutResultPollingService);
  readonly #depositPaymentResultAdapter = inject(DepositPaymentResultAdapter);
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #http = inject(HttpClient);
  readonly #userService = inject(UserService);

  getDepositPaymentResult({
    b2bUserId,
    cart,
    partnerId,
    paymentGateway,
  }: {
    cart: Cart;
    partnerId: number;
    paymentGateway: PaymentCheckoutET;
    b2bUserId?: number;
  }): Observable<BaseResponse<DepositPaymentResult>> {
    const target = this.#distributorRoute.pairTarget();
    const isBusinessUser = this.#userService.isBusiness();
    const resolvedUserId = this.#userService.getUser()?.id ?? b2bUserId;
    if (target === null && isBusinessUser && (resolvedUserId == null || resolvedUserId === 0)) {
      return throwError(() => new Error('Missing cart user for deposit payment result; cannot poll without a valid userId'));
    }

    this.#checkoutLogger.info(
      'Start requesting deposit payment result',
      this.#getCheckoutLoggerContext(cart, {
        paymentGateway,
      }),
      { cartId: cart.id },
    );

    const resultUrl = this.#getDepositPaymentResultUrl(target, partnerId, cart.id ?? '', isBusinessUser, resolvedUserId);
    return this.#createDepositPaymentPollingObservable(cart, resultUrl, target);
  }

  #createDepositPaymentPollingObservable(
    cart: Cart,
    resultUrl: string,
    target: DistributorTarget | null,
  ): Observable<BaseResponse<DepositPaymentResult>> {
    return this.#checkoutResultPolling.runPollingUntilSettled$(cart, this.#getDepositPaymentResultStatus(cart, resultUrl, target), {
      inProgressLogMessage: 'Deposit payment result in progress',
      maxRetryAttempts: MAX_RETRY_ATTEMPTS,
      retryDelayMs: RETRY_TIME_MS,
      timeoutMessage: 'errors.checkout.pollingTimeout',
      getCheckoutLogContext: (c, data) => this.#getCheckoutLoggerContext(c, data),
      normalizeAttempt: response => this.#normalizeDepositPollingAttempt(response as BaseResponse<DepositPaymentResult | null>),
    });
  }

  #getCheckoutLoggerContext(cart: Cart, data?: Record<string, unknown> | null): CheckoutLogContext {
    return {
      cartId: cart.id,
      data,
      stage: CheckoutStageEnum.REQUESTING_DEPOSIT_PAYMENT_RESULT,
    };
  }

  #getDepositPaymentResultStatus(
    cart: Cart,
    resultUrl: string,
    target: DistributorTarget | null,
  ): Observable<BaseResponse<DepositPaymentResult | null>> {
    return this.#http.get<BaseResponse<DepositPaymentResultResponse>>(resultUrl, { headers: this.#scopedOrganizationHeaders(target) }).pipe(
      map(response => this.#depositPaymentResultAdapter.fromApi(response)),
      catchError((error: HttpErrorResponse) =>
        this.#checkoutResultPolling.onHttpGetPollingError$(cart, error, {
          getCheckoutLogContext: (c, data) => this.#getCheckoutLoggerContext(c, data),
          getInProgressResponse: () => this.#depositPaymentResultAdapter.getInProgressResponse(),
        }),
      ),
    );
  }

  #getDepositPaymentResultUrl(
    target: DistributorTarget | null,
    partnerId: number,
    cartId: string,
    isBusinessUser: boolean,
    b2bUserId: number | null | undefined,
  ): string {
    if (target !== null) {
      return `${environment.apiGWBaseUrl}/2.0/partners/${target.targetOrganizationId}/carts/${cartId}/deposit-payment-result`;
    }
    const base = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}`;
    if (isBusinessUser && b2bUserId != null && b2bUserId !== 0) {
      return `${base}/users/${b2bUserId}/carts/${cartId}/deposit-payment-result`;
    }
    return `${base}/carts/${cartId}/deposit-payment-result`;
  }

  #normalizeDepositPollingAttempt(result: BaseResponse<DepositPaymentResult | null>): BaseResponse<DepositPaymentResult> {
    if (result.error != null) {
      throw result;
    }
    const data = result.data;

    if (data == null) {
      throw new BaseResponse<null>(null, { code: 400, message: 'errors.generic' });
    }

    const status = String(data.status);

    if (isDepositPaymentStatusCompleted(status)) {
      return new BaseResponse<DepositPaymentResult>(data, null);
    }

    if (isDepositPaymentStatusTerminalFailure(status)) {
      const depositPaymentResultStatus = status.toUpperCase();
      throw new BaseResponse<null>(null, {
        code: 400,
        error: { depositPaymentResultStatus },
        message: `errors.depositPaymentResult.${depositPaymentResultStatus}`,
      });
    }
    throw result;
  }

  #scopedOrganizationHeaders(target: DistributorTarget | null): HttpHeaders {
    return new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
  }
}
