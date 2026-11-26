import type { Reservation, ReservationApi } from './reservation.model';

export interface ReservationsListApi {
  count: number;
  reservations?: ReservationApi[];
}

export interface ReservationsPage {
  readonly count: number;
  readonly pagination: ReservationsPagination;
  readonly reservations: readonly Reservation[];
}

export interface ReservationsPagination {
  readonly last: number | null;
  readonly next: number | null;
  readonly previous: number | null;
}
