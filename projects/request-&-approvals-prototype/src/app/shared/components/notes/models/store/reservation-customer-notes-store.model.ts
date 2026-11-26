import { BaseErrorResponse } from '../../../../models/base-response';
import { CustomerNote } from '../../../../models/customer-note/customer-note.model';

export interface ReservationCustomerNotesStoreState {
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly mutationError: BaseErrorResponse | null;
  readonly notes: CustomerNote[];
  readonly reservationId: string | null;
}

export const initialReservationCustomerNotesState: ReservationCustomerNotesStoreState = {
  error: null,
  isLoading: false,
  isMutating: false,
  mutationError: null,
  notes: [],
  reservationId: null,
};
