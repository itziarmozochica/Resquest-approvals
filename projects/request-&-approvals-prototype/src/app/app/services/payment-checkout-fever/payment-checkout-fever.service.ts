import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentMethod } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { BaseResponse, HttpErrorResponseWithBaseError } from '@fz-original/app/shared/models/base-response';
import { getHttpBaseErrorResponseError } from '@fz-original/app/shared/utils/error-response.utils';
import { catchError, Observable, of, throwError } from 'rxjs';

import { FeverCheckoutBody } from '../../models/payment-checkout-fever.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutFeverService {
  #http = inject(HttpClient);

  /**
   * Post request return is wrongly typed on purpose to match.
   *
   * Backend returns simply {}
   *
   * @returns Observable<BaseResponse<{}>>
   */
  createFeverCheckout(
    url: string,
    userId: number,
    paymentMethod: PaymentMethod,
    channel: string,
    headers: Record<string, string> = {},
  ): Observable<BaseResponse<object>> {
    const body: FeverCheckoutBody = {
      user_id: userId,
      reservation_id: paymentMethod.paymentTransactionId ?? '',
      payment_method_type: paymentMethod.paymentType,
      channel_id: channel,
    };
    return this.#http
      .post<BaseResponse<object>>(url, body, { headers: new HttpHeaders(headers) })
      .pipe(catchError(error => this.#handleError(error)));
  }

  #handleError(error: HttpErrorResponseWithBaseError): Observable<BaseResponse<object>> {
    const errorBody = error.error?.error;
    const statusCode = errorBody?.status_code || errorBody?.code;
    if (statusCode === 826) {
      return of(new BaseResponse({}, null));
    }
    return throwError(() => getHttpBaseErrorResponseError(error));
  }
}
