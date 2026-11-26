import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DelegatedUnifyCheckoutBody } from '@fz-original/app/app/models/payment-checkout-delegated.model';
import { PaymentMethod } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { catchError, map, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutDelegatedService {
  #http = inject(HttpClient);

  createDelegatedCheckout(
    url: string,
    userId: number,
    paymentMethod: PaymentMethod,
    channel: string,
    overrideCapacity?: boolean,
    cashReceived?: number,
    cashLegAmount?: number,
    splitLegIndex?: number,
    splitPaymentFlag?: boolean,
    deviceId?: string,
  ): Observable<any> {
    const transactionId = paymentMethod.paymentTransactionId;
    // transaction_id becomes the payment's primary key: omit it so the backend generates a unique one.
    const body: DelegatedUnifyCheckoutBody = {
      user_id: userId,
      ...(typeof transactionId === 'string' && transactionId.length > 0 && { transaction_id: transactionId }),
      payment_method_type: paymentMethod.paymentType,
      ...(channel !== undefined && { channel_id: channel }),
      ...(overrideCapacity === true && { override_capacity: true }),
      ...(cashReceived !== undefined && Number.isFinite(cashReceived) && cashReceived > 0 && { cash_received: cashReceived }),
      ...(cashLegAmount !== undefined && Number.isFinite(cashLegAmount) && cashLegAmount > 0 && { cash_leg_amount: cashLegAmount }),
      ...(splitLegIndex !== undefined && Number.isInteger(splitLegIndex) && splitLegIndex >= 0 && { split_leg_index: splitLegIndex }),
      ...(splitPaymentFlag === true && { split_payment_flag: true }),
      ...(deviceId !== undefined && { device_id: deviceId }),
    };
    return this.#http.post<any>(url, body).pipe(
      // The body must survive: for a split-payment checkout (`split_payment_flag: true`) it carries
      // the `transaction_id` that identifies the split session for later polls and cancels.
      map(response => new BaseResponse(response ?? {}, null)),
      catchError(error => this.#handleError(error)),
    );
  }

  /**
   * We should probably not handle error this way
   * since this is not Adyen.
   *
   * @todo refine.
   */
  #handleError(error: any) {
    const codeError = error?.status_code || error?.error?.status_code || error?.error?.code || error?.error?.error?.code;
    if (codeError == 826) {
      return of(new BaseResponse({}, null));
    }
    return throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, 'adyen'));
  }
}
