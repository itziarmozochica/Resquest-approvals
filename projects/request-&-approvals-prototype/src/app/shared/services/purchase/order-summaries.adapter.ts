import { inject, Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { ValidationOrderSummary } from '../../models/order/order-summary.model';
import { OrderSummaryDTO } from './models/order-summary.dto';
import { OrderSummaryAdapter } from './order-summary.adapter';

@Injectable({
  providedIn: 'root',
})
export class OrderSummariesAdapter implements AdapterInterface<BaseResponse<ValidationOrderSummary[]>, BaseResponse<OrderSummaryDTO[]>> {
  readonly #orderSummaryAdapter = inject(OrderSummaryAdapter);

  fromApi(response: BaseResponse<OrderSummaryDTO[]>): BaseResponse<ValidationOrderSummary[]> {
    return new BaseResponse<ValidationOrderSummary[]>(this.#getData(response?.data), response?.error ?? null);
  }

  #getData(data: OrderSummaryDTO[] | null): ValidationOrderSummary[] | null {
    if (!data) {
      return null;
    }
    return data.map(dto => this.#orderSummaryAdapter.fromApi(dto));
  }
}
