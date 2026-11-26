import type { ReservationEndCustomerUpdate } from '../models/reservation-end-customer-update.model';

export interface ReservationEndCustomerBody {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export function toEndCustomerBody(update: ReservationEndCustomerUpdate): ReservationEndCustomerBody {
  return { email: update.email, first_name: update.firstName, last_name: update.lastName };
}
