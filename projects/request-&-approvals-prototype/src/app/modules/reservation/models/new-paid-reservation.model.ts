import { NewReservation } from './new-reservation.model';

export interface NewPaidReservation extends NewReservation {
  order: {
    id: number;
  };
  orderIds: number[];
  externalReservationIdPersistFailed?: boolean;
}
