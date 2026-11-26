import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, map, Observable, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../models/base-response';
import { PaginatedOrders, SeatingInfoApiResponse } from '../../../models/move-customers-seats';
import { getHttpBaseErrorResponseError } from '../../../utils/error-response.utils';
import { OrderAdapter } from './order.adapter';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  #http = inject(HttpClient);
  #orderAdapter = inject(OrderAdapter);

  getSeats(
    partnerId: number,
    planId: number,
    sessionId: number,
    page?: number,
    pageSize?: number,
    apiVersion?: string,
    orderId?: number,
  ): Observable<BaseResponse<PaginatedOrders>> {
    const url = this.#buildSeatsUrl(partnerId, planId, sessionId, page, pageSize, apiVersion, orderId);
    return this.#http.get<SeatingInfoApiResponse>(url).pipe(
      map(response => this.#orderAdapter.fromApi(response)),
      catchError(error => throwError(() => getHttpBaseErrorResponseError(error))),
    );
  }

  #buildSeatsUrl(
    partnerId: number,
    planId: number,
    sessionId: number,
    page = 1,
    pageSize = 10,
    apiVersion = '3.0',
    orderId?: number,
  ): string {
    let url = `${environment.apiBaseUrl}/${apiVersion}/partners/${partnerId}/plan/${planId}/session/${sessionId}/seating-info/?page=${page}&page_size=${pageSize}`;
    if (orderId !== undefined) {
      url += `&order_id=${orderId}`;
    }
    return url;
  }
}
