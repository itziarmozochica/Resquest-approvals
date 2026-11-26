import type { NewReservationOrder, NewReservationOrderApi } from './new-reservation.model';

export interface ReservationPaymentApi {
  order?: NewReservationOrderApi | null;
  order_ids?: number[] | null;
}

export interface ReservationPayment {
  readonly order: NewReservationOrder | null;
  readonly orderIds: readonly number[];
}
