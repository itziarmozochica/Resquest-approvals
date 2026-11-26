import { BaseErrorResponse } from '../../../../models/base-response';
import { CustomerNote } from '../../../../models/customer-note/customer-note.model';

export interface OrderCustomerNotesStoreState {
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly mutationError: BaseErrorResponse | null;
  readonly notes: CustomerNote[];
  readonly orderId: number | null;
}

export const initialOrderCustomerNotesState: OrderCustomerNotesStoreState = {
  error: null,
  isLoading: false,
  isMutating: false,
  mutationError: null,
  notes: [],
  orderId: null,
};
