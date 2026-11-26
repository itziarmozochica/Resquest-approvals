import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../../shared/models/base-response';
import { Order } from '../../../shared/models/order/order.model';
import { OrderDTO } from '../../../shared/services/purchase/models/orders.dto';
import { OrderAdapter } from '../../../shared/services/purchase/order.adapter';
import { ReservationDetail } from '../models/reservation-detail.model';
import { ReservationDetailDTO } from './models/reservation-detail.dto';
import { ReservationAdapter } from './reservation.adapter';

@Injectable({
  providedIn: 'root',
})
export class ReservationDetailAdapter implements AdapterInterface<BaseResponse<ReservationDetail>> {
  constructor(
    private reservationAdapter: ReservationAdapter,
    private orderAdapter: OrderAdapter,
  ) {}

  fromApi(response: BaseResponse<ReservationDetailDTO>): BaseResponse<ReservationDetail> {
    return new BaseResponse<ReservationDetail>(this.getData(response?.data), this.getError(response?.error));
  }

  private getData(data: ReservationDetailDTO | null): ReservationDetail | null {
    if (!data || !data.reservation) {
      return null;
    }

    const mappedOrder: Order | undefined = data.order != null ? this.orderAdapter.fromApi(data.order) : undefined;
    let mappedOrders: Order[];
    if (data.orders != null) {
      mappedOrders = data.orders.map((order: OrderDTO) => this.orderAdapter.fromApi(order));
    } else if (mappedOrder !== undefined) {
      mappedOrders = [mappedOrder];
    } else {
      mappedOrders = [];
    }

    const result: ReservationDetail = {
      orders: mappedOrders,
      reservationData: this.reservationAdapter.fromApi(data.reservation),
    };

    if (mappedOrder !== undefined) {
      result.order = mappedOrder;
    }

    return result;
  }

  private getError(error: any): any {
    if (!error) {
      return null;
    }
    return { code: error.code, message: `errors.${error.code}` };
  }
}
