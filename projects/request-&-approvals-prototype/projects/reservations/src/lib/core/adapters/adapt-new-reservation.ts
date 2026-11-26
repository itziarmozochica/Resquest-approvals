import type { BaseResponse } from '@fz/http-models';

import type { NewReservation, NewReservationApi } from '../models/new-reservation.model';
import { adaptOrder, adaptOrderIds } from './adapt-order';

export function adaptNewReservation(response: BaseResponse<NewReservationApi>): NewReservation | null {
  return adaptData(response.data);
}

function adaptData(data: NewReservationApi | null | undefined): NewReservation | null {
  if (data === null || data === undefined) {
    return null;
  }
  const order = adaptOrder(data.order);
  return {
    expiresAt: data.expires_at ?? null,
    id: data.id,
    locator: data.locator,
    order,
    orderIds: adaptOrderIds(data.order_ids, order),
  };
}
