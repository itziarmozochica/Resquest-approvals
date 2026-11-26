import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BaseResponse } from '../../../models/base-response';
import { ErrorResponseUtils } from '../../../utils/error-response.utils';
import { SetOrderProductServingTimeQuery } from './set-order-product-serving-time-query';

export interface OrderProductServingTime {
  servingAt: string | null;
  sessionId: number;
}

interface OrderProductServingTimeDTO {
  serving_at: string | null;
  session_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderServingTimeService {
  readonly #http = inject(HttpClient);

  setProductServingTime(query: SetOrderProductServingTimeQuery): Observable<BaseResponse<OrderProductServingTime>> {
    return this.#http
      .put<BaseResponse<OrderProductServingTimeDTO>>(this.#getSetProductServingTimeUrl(query), { serving_at: query.servingAt })
      .pipe(
        map(
          response =>
            new BaseResponse<OrderProductServingTime>(
              { servingAt: response?.data?.serving_at ?? null, sessionId: response?.data?.session_id ?? query.sessionId },
              response?.error ?? null,
            ),
        ),
        catchError(error => of(new BaseResponse<OrderProductServingTime>(null, ErrorResponseUtils.getErrorResponseError(error)))),
      );
  }

  #getSetProductServingTimeUrl(query: SetOrderProductServingTimeQuery): string {
    const scope = query.userId != null ? `partners/${query.partnerId}/users/${query.userId}` : `partners/${query.partnerId}`;
    return `${environment.apiBaseUrl}/3.0/${scope}/orders/${query.orderId}/products/${query.sessionId}/serving-time/`;
  }
}
