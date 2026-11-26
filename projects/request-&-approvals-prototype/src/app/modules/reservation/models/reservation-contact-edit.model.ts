export interface UpdateReservationContactRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface UpdateReservationContactRequestDTO {
  email: string;
  first_name?: string;
  last_name?: string;
}
