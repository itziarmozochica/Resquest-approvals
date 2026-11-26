import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { Order } from '../../models/order/order.model';
import { OrderDTO } from './models/orders.dto';
import { OrderAdapter } from './order.adapter';

@Injectable({
  providedIn: 'root',
})
export class OrdersAdapter implements AdapterInterface<BaseResponse<Order[]>> {
  constructor(private orderAdapter: OrderAdapter) {}

  fromApi(response: BaseResponse<Array<OrderDTO>>): BaseResponse<Order[]> {
    return new BaseResponse<Order[]>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: BaseErrorResponse) {
    let error = null;
    if (data) {
      error = { code: data.code, message: `errors.${data.code}` };
    }
    return error;
  }

  private getData(data: Array<OrderDTO> | null): Order[] | null {
    if (!data) {
      return null;
    }

    return data.map(order => this.orderAdapter.fromApi(order));
  }
}
