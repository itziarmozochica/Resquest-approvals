export interface ReservationContactUpdate {
  readonly acceptedTerms?: readonly string[];
  readonly email?: string;
  readonly endCustomerEmail?: string | null;
  readonly endCustomerFirstName?: string | null;
  readonly endCustomerLastName?: string | null;
  readonly firstName?: string;
  readonly lastName?: string;
}
