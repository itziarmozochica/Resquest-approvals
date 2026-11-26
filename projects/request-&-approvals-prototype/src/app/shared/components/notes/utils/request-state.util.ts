import type { OrderCustomerNotesStoreState } from '../models/store/order-customer-notes-store.model';

type LoadSlice = Pick<OrderCustomerNotesStoreState, 'error' | 'isLoading'>;

export function setPending(): LoadSlice {
  return { error: null, isLoading: true };
}

export function setError(error: unknown): LoadSlice {
  return { error, isLoading: false };
}

export function setSuccess(): LoadSlice {
  return { error: null, isLoading: false };
}
