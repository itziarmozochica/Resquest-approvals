import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCheckout, AdyenCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { PaymentCheckoutTransaction, PaymentCheckoutTransactionData } from '@fz-original/app/app/models/payment.model';
import { AdyenCreateCheckoutAdapter } from '@fz-original/app/app/services/payment-checkout-adyen/adyen-create-checkout.adapter';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { catchError, defer, filter, map, Observable, ReplaySubject, shareReplay, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutAdyenService {
  #adyenCreateCheckoutAdapter = inject(AdyenCreateCheckoutAdapter);
  #cancelHadCompletedPayments$ = new ReplaySubject<boolean | null>(1);
  #checkoutLoggerService = inject(CheckoutLoggerService);
  #http = inject(HttpClient);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);

  cancel(currency: string, transactionId: string, url: string): Observable<undefined> {
    return defer(() => {
      this.#cancelHadCompletedPayments$.next(null);
      const body: Record<string, unknown> = { currency, transaction_id: transactionId };
      return this.#http.post<{ data?: { has_completed_payments?: boolean } }>(url, body);
    }).pipe(
      tap({
        error: () => this.#cancelHadCompletedPayments$.next(false),
        next: response => this.#cancelHadCompletedPayments$.next(response?.data?.has_completed_payments === true),
      }),
      map((): undefined => undefined),
      catchError(error =>
        throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET)),
      ),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  get cancelHadCompletedPayments$(): Observable<boolean> {
    return this.#cancelHadCompletedPayments$.pipe(filter((value): value is boolean => value !== null));
  }

  createAdyenCheckout(url: string, cartId: string, userId: number, request: AdyenCreateCheckoutBody): Observable<AdyenCheckout> {
    const adyenDeviceId: string | undefined = request.deviceId ?? this.#paymentConfigStorageService.getConfiguration()?.deviceId;
    if (adyenDeviceId === undefined) {
      return throwError(() => new BaseResponse(null, { code: 400, message: 'errors.adyen.noDeviceSetting' }));
    }
    request.deviceId = adyenDeviceId;
    this.#checkoutLoggerService.info('Going to create Adyen Checkout', this.#getCheckoutLoggerContext(cartId));
    return this.#createCheckout(url, cartId, userId, request).pipe(
      map((response: BaseResponse<PaymentCheckoutTransaction>) => {
        const checkout = response.data as PaymentCheckoutTransaction;
        return {
          deviceId: adyenDeviceId,
          transactionId: checkout.transactionId,
          ...(checkout.blockBooker === true && { blockBooker: true }),
          ...(checkout.blocksPurchaseOnFailure === true && { blocksPurchaseOnFailure: true }),
        };
      }),
    );
  }

  #createCheckout(
    url: string,
    cartId: string,
    userId: number,
    request: AdyenCreateCheckoutBody,
  ): Observable<BaseResponse<PaymentCheckoutTransaction>> {
    return this.#http.post<PaymentCheckoutTransactionData>(url, this.#adyenCreateCheckoutAdapter.toApi(request, userId)).pipe(
      map(response => {
        this.#checkoutLoggerService.info(
          'Adyen checkout created',
          this.#getCheckoutLoggerContext(cartId, {
            transactionId: response.transaction_id,
          }),
          { cartId: cartId },
        );
        return this.#adyenCreateCheckoutAdapter.fromApi(response);
      }),
      catchError(error => {
        this.#checkoutLoggerService.error(
          'Error on create Adyen checkout',
          this.#getCheckoutLoggerContext(cartId, {
            error: JSON.stringify(error),
          }),
          { cartId: cartId, error },
        );
        return throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, 'adyen'));
      }),
    );
  }

  #getCheckoutLoggerContext(cartId: string, data: Record<string, unknown> | null = null): CheckoutLogContext {
    return { cartId: cartId, data, stage: CheckoutStageEnum.CHECKOUT };
  }
}
