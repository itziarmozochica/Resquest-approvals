import type { BaseResponse } from '@fz/http-models';

import type { ReservationPayment, ReservationPaymentApi } from '../models/reservation-payment.model';
import { adaptOrder, adaptOrderIds } from './adapt-order';

export function adaptReservationPayment(response: BaseResponse<ReservationPaymentApi> | null): ReservationPayment | null {
  const data = response?.data;

  if (data === null || data === undefined) {
    return null;
  }

  const order = adaptOrder(data.order);

  return { order, orderIds: adaptOrderIds(data.order_ids, order) };
}
