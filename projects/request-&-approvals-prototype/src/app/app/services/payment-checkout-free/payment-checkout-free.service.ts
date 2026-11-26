import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { FreeUnifyCheckoutBody } from '@fz-original/app/app/models/payment-checkout-free.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { catchError, map, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutFreeService {
  #http = inject(HttpClient);

  createFreeCheckout(url: string, userId: number, channel?: string, overrideCapacity?: boolean): Observable<any> {
    const body: FreeUnifyCheckoutBody = {
      user_id: userId,
      ...(channel !== undefined && { channel_id: channel }),
      ...(overrideCapacity === true && { override_capacity: true }),
    };
    return this.#http.post<any>(url, body).pipe(
      // The body must survive: a €0 cart is settled without a payment, so the `split_session_id` it
      // carries is the only handle the box-office has on the cart's async fiscalization outcome.
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
