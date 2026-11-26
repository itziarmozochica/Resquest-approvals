import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Order } from '../../../../shared/models/order/order.model';
import { OrderDTO } from '../../../../shared/services/purchase/models/orders.dto';
import { OrderBaseResponseAdapter } from '../../../../shared/services/purchase/order-base-response.adapter';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';

@Injectable({
  providedIn: 'root',
})
export class OpenOrderService {
  constructor(
    private httpClient: HttpClient,
    private orderBaseResponseAdapter: OrderBaseResponseAdapter,
  ) {}

  getOrder(partnerId: number, dataBase64: string): Observable<BaseResponse<Order>> {
    const path = this.getOrderUrl(partnerId);
    const params = this.getOrderParams(dataBase64);

    return this.httpClient.get<BaseResponse<OrderDTO>>(path, { params: params }).pipe(
      switchMap(result => {
        return of(this.orderBaseResponseAdapter.fromApi(result));
      }),
      catchError(error => {
        throw ErrorResponseUtils.getErrorResponseError(error);
      }),
    );
  }

  private getOrderUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/encoded_orders/`;
  }

  private getOrderParams(dataBase64: string): HttpParams {
    return new HttpParams().append('data', dataBase64);
  }
}
