import type { ReservationContactUpdate } from '../models/reservation-contact-update.model';

export interface ReservationContactBody {
  accepted_terms?: readonly string[];
  email?: string;
  end_customer_email?: string | null;
  end_customer_first_name?: string | null;
  end_customer_last_name?: string | null;
  first_name?: string;
  last_name?: string;
}

const WIRE_KEYS: Readonly<Record<keyof ReservationContactUpdate, keyof ReservationContactBody>> = {
  acceptedTerms: 'accepted_terms',
  email: 'email',
  endCustomerEmail: 'end_customer_email',
  endCustomerFirstName: 'end_customer_first_name',
  endCustomerLastName: 'end_customer_last_name',
  firstName: 'first_name',
  lastName: 'last_name',
};

export function toContactBody(update: ReservationContactUpdate): ReservationContactBody {
  return Object.fromEntries(
    (Object.keys(WIRE_KEYS) as (keyof ReservationContactUpdate)[])
      .filter((key: keyof ReservationContactUpdate) => update[key] !== undefined)
      .map((key: keyof ReservationContactUpdate) => [WIRE_KEYS[key], update[key]]),
  ) as ReservationContactBody;
}
