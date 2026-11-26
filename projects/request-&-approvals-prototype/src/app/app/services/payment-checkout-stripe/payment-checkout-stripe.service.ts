import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { StripeCreateCheckoutBodyData } from '@fz-original/app/app/models/payment-checkout-stripe.model';
import { PaymentMethod } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { STRIPE_API_VERSION } from '@fz-original/app/shared/services/stripe/stripe.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { catchError, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutStripeService {
  #http = inject(HttpClient);
  #stripeApiVersion = inject(STRIPE_API_VERSION);

  /**
   * Post request return is wrongly typed on purpose to match.
   *
   * Backend returns simply {}
   *
   * @returns Observable<BaseResponse<{}>>
   */
  createStripeCheckout(
    url: string,
    userId: number,
    paymentMethod: Required<PaymentMethod>,
    paymentIntentId: string,
    channel?: string,
    headers: Record<string, string> = {},
  ): Observable<BaseResponse<object>> {
    const body: StripeCreateCheckoutBodyData = {
      user_id: userId,
      reservation_id: paymentMethod.paymentTransactionId,
      payment_method_type: paymentMethod.paymentType,
      payment_intent_id: paymentIntentId,
      api_version: this.#stripeApiVersion,
      ...(channel !== undefined && { channel_id: channel as string }),
    };
    return this.#http
      .post<BaseResponse<object>>(url, body, { headers: new HttpHeaders(headers) })
      .pipe(catchError(error => this.#handleError(error)));
  }

  #handleError(error?: (HttpErrorResponse & { status_code: number }) | null): Observable<BaseResponse<object>> {
    const codeError = error?.status_code || error?.error?.status_code || error?.error?.code || error?.error?.error?.code;
    if (codeError == 826) {
      return of(new BaseResponse({}, null));
    }
    return throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, 'stripe'));
  }
}
