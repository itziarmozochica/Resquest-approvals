import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { Order } from '../../models/order/order.model';
import { OrderDTO } from './models/orders.dto';
import { OrderAdapter } from './order.adapter';

@Injectable({
  providedIn: 'root',
})
export class OrderBaseResponseAdapter implements AdapterInterface<BaseResponse<Order>> {
  constructor(private orderAdapter: OrderAdapter) {}

  fromApi(response: BaseResponse<OrderDTO>): BaseResponse<Order> {
    return new BaseResponse<Order>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    let error = null;
    if (data) {
      error = { code: data.code, message: `errors.${data.code}` };
    }
    return error;
  }

  private getData(order: OrderDTO | null): Order | null {
    if (!order) {
      return null;
    }
    return this.orderAdapter.fromApi(order);
  }
}
