import type { BaseResponse } from '@fz/http-models';

import type { ReservationsListApi, ReservationsPage, ReservationsPagination } from '../models/reservations-page.model';
import { adaptReservation } from './adapt-reservation';

export function adaptReservationsList(
  response: BaseResponse<ReservationsListApi> | null,
  pagination: ReservationsPagination,
): ReservationsPage | null {
  const list = response?.data;

  if (list === null || list === undefined) {
    return null;
  }
  return { count: list.count, pagination, reservations: (list.reservations ?? []).map(adaptReservation) };
}
