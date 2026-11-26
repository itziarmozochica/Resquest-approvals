import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

import { BaseErrorResponse, BaseResponse } from '../../../models/base-response';
import { Cart } from '../../../models/cart/cart.model';
import { CheckoutLoggerService } from '../../checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '../../checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '../../checkout-logger/models/checkout-stage.enum';

export interface BookResultErrorContext {
  partnerId?: number;
  planId?: number;
  placeId?: number;
  deviceId?: string;
  transactionId?: string;
  attempts?: number;
  elapsedMsSincePurchase?: number;
  paymentGateway?: string;
}

export interface CheckoutHttpPollingErrorHandlerOptions<T> {
  getCheckoutLogContext: (cart: Cart, data?: Record<string, unknown> | null) => CheckoutLogContext;
  getInProgressResponse: () => BaseResponse<T>;
  bookResultErrorContext?: BookResultErrorContext;
}

export interface CheckoutPollingLoopOptions<T> {
  inProgressLogMessage: string;
  maxRetryAttempts: number;
  retryDelayMs: number;
  timeoutMessage?: string;
  getCheckoutLogContext: (cart: Cart, data?: Record<string, unknown> | null) => CheckoutLogContext;
  normalizeAttempt: (response: BaseResponse<unknown>) => BaseResponse<T>;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutResultPollingService {
  private static readonly CANCELLED_TRANSACTION_CODE = 857;

  readonly #checkoutLogger = inject(CheckoutLoggerService);

  onHttpGetPollingError$<T>(
    cart: Cart,
    error: HttpErrorResponse,
    options: CheckoutHttpPollingErrorHandlerOptions<T>,
  ): Observable<BaseResponse<T>> {
    const errorCode = error.error?.status_code || error.error?.code || error.error?.error?.code;

    if (CheckoutResultPollingService.shouldKeepPollingAfterHttpError(error)) {
      this.#checkoutLogger.info(
        'Continue polling',
        options.getCheckoutLogContext(cart, {
          code: error.error?.status_code,
          status: error.status,
        }),
        { cartId: cart.id },
      );
      return of(options.getInProgressResponse());
    }

    this.#checkoutLogger.info(
      'Stop polling because we get an error',
      options.getCheckoutLogContext(cart, {
        code: error.error?.status_code,
        status: error.status,
      }),
      { cartId: cart.id },
    );

    if (error.status >= 400 && error.status < 500 && options.bookResultErrorContext) {
      this.#logBookResultClientError(cart, error, options.bookResultErrorContext);
    }

    let errorMessage = 'errors.generic';
    let finalErrorCode = error.status;

    if (errorCode) {
      errorMessage = String(errorCode);
      finalErrorCode = errorCode;
    } else if (error.error?.status_code) {
      errorMessage = String(error.error.status_code);
      finalErrorCode = error.error.status_code;
    }

    return throwError(
      () =>
        new BaseResponse<null>(null, {
          code: finalErrorCode,
          error: error,
          errorCode: finalErrorCode,
          message: errorMessage,
        }),
    );
  }

  runPollingUntilSettled$<T>(
    cart: Cart,
    pollAttempt$: Observable<BaseResponse<unknown>>,
    options: CheckoutPollingLoopOptions<T>,
  ): Observable<BaseResponse<T>> {
    const timeoutMessage = options.timeoutMessage ?? 'errors.adyen.timeout';
    return pollAttempt$.pipe(
      map(response => options.normalizeAttempt(response)),
      retry({
        count: options.maxRetryAttempts,
        delay: (err: BaseErrorResponse | BaseResponse<unknown>) => this.#retryDelayAfterFailedAttempt(err, cart, options),
      }),
      catchError(err => this.#pollingCatchError(err, timeoutMessage)),
    );
  }

  static shouldKeepPollingAfterHttpError(error: HttpErrorResponse): boolean {
    if (error.status === 404 && error.error?.status_code === 855) {
      return true;
    }

    if (error.status === 502 || error.status === 504 || error.status === 503) {
      return true;
    }

    return false;
  }

  #isFatalCheckoutPollError(error: BaseErrorResponse | BaseResponse<unknown>): boolean {
    const isResponseError = 'code' in error || (error instanceof BaseResponse && error.error);
    return !!isResponseError;
  }

  #pollingCatchError(error: unknown, timeoutMessage: string): Observable<never> {
    if (error instanceof BaseResponse && error.error) {
      return throwError(() => error);
    }
    return throwError(() => new BaseResponse(null, { code: 408, message: timeoutMessage }));
  }

  #retryDelayAfterFailedAttempt<T>(
    error: BaseErrorResponse | BaseResponse<unknown>,
    cart: Cart,
    options: CheckoutPollingLoopOptions<T>,
  ): Observable<number> {
    if (this.#isFatalCheckoutPollError(error) || (error instanceof BaseResponse && error.error?.code === 400)) {
      return throwError(() => error);
    }

    this.#checkoutLogger.info(
      options.inProgressLogMessage,
      options.getCheckoutLogContext(cart, {
        response: JSON.stringify(error),
      }),
      { cartId: cart.id, error },
    );

    return timer(options.retryDelayMs);
  }

  #logBookResultClientError(cart: Cart, error: HttpErrorResponse, context?: BookResultErrorContext): void {
    const internalCode = error.error?.status_code || error.error?.code || error.error?.error?.code;
    const rawBody = error.error ? JSON.stringify(error.error) : '';

    const logPayload = {
      http_status: error.status,
      internal_code: internalCode,
      cart_id: cart.id,
      user_id: cart.userId,
      payment_gateway: context?.paymentGateway || 'unknown',
      raw_body_truncated: this.#truncate(rawBody, 500),
      ...(context?.partnerId !== undefined && { partner_id: context.partnerId }),
      ...(context?.planId !== undefined && { plan_id: context.planId }),
      ...(context?.placeId !== undefined && { place_id: context.placeId }),
      ...(context?.deviceId && { device_id: context.deviceId }),
      ...(context?.transactionId && { transaction_id: context.transactionId }),
      ...(context?.attempts !== undefined && { attempts: context.attempts }),
      ...(context?.elapsedMsSincePurchase !== undefined && { elapsed_ms_since_purchase: context.elapsedMsSincePurchase }),
    };

    const logContext = {
      cartId: cart.id,
      stage: CheckoutStageEnum.REQUESTING_BOOK_RESULT,
    };

    if (internalCode === CheckoutResultPollingService.CANCELLED_TRANSACTION_CODE) {
      this.#checkoutLogger.info('book_result.cancelled', logContext, logPayload);
      return;
    }

    this.#checkoutLogger.error('book_result.client_error', logContext, logPayload);
  }

  #truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength) + '...';
  }
}
