import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckout } from '@fz-original/app/app/enums/payment.enum';
import {
  RazorpayCheckout,
  RazorpayCreateCheckoutBody,
  RazorpayCreateCheckoutBodyData,
} from '@fz-original/app/app/models/payment-checkout-razorpay.model';
import { PaymentCheckoutTransaction, PaymentCheckoutTransactionData } from '@fz-original/app/app/models/payment.model';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutRazorpayService {
  #checkoutLoggerService: CheckoutLoggerService = inject(CheckoutLoggerService);
  #http: HttpClient = inject(HttpClient);
  #paymentConfigStorageService: PaymentConfigStorageService = inject(PaymentConfigStorageService);

  cancel(currency: string, transactionId: string, url: string): Observable<undefined> {
    return this.#http.post(url, { currency, transaction_id: transactionId }).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.razorpay]))),
    );
  }

  createRazorpayCheckout(url: string, cartId: string, userId: number, request: RazorpayCreateCheckoutBody): Observable<RazorpayCheckout> {
    const razorpayDeviceId: string | undefined = this.#paymentConfigStorageService.getConfiguration()?.deviceId;
    if (razorpayDeviceId === undefined) {
      return throwError(() => ({ data: null, error: { code: 400, message: 'errors.razorpay.noDeviceSetting' } }));
    }
    request.razorpayDeviceId = razorpayDeviceId;
    this.#checkoutLoggerService.info('Going to create Razorpay Checkout', this.#getCheckoutLoggerContext(cartId));
    return this.#createCheckout(url, cartId, userId, request).pipe(
      map((response: BaseResponse<PaymentCheckoutTransaction>) => ({
        transactionId: (response.data as PaymentCheckoutTransaction).transactionId,
        deviceId: razorpayDeviceId,
      })),
    );
  }

  #createCheckout(
    url: string,
    cartId: string,
    userId: number,
    request: RazorpayCreateCheckoutBody,
  ): Observable<BaseResponse<PaymentCheckoutTransaction>> {
    return this.#http
      .post<PaymentCheckoutTransactionData>(url, {
        razorpay_device_id: request.razorpayDeviceId,
        user_id: userId,
        channel_id: request.channelId,
        payment_method_type: request.paymentMethodType,
      } as RazorpayCreateCheckoutBodyData)
      .pipe(
        map((response: PaymentCheckoutTransactionData) => {
          this.#checkoutLoggerService.info(
            'Razorpay checkout created',
            this.#getCheckoutLoggerContext(cartId, {
              transactionId: response.transaction_id,
            }),
            { cartId: cartId },
          );
          return new BaseResponse(this.#getResponseData(response), null);
        }),
        catchError((error: BaseErrorResponse) => {
          this.#checkoutLoggerService.error(
            'Error on create Razorpay checkout',
            this.#getCheckoutLoggerContext(cartId, {
              error: JSON.stringify(error),
            }),
            { cartId: cartId, error },
          );
          return throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, 'razorpay'));
        }),
      );
  }

  #getCheckoutLoggerContext(cartId: string, data: Record<string, unknown> | null = null): CheckoutLogContext {
    return { stage: CheckoutStageEnum.CHECKOUT, cartId: cartId, data };
  }

  #getResponseData(response: PaymentCheckoutTransactionData): PaymentCheckoutTransaction {
    return {
      transactionId: response.transaction_id,
    };
  }
}
