import { BaseErrorResponse } from '../../../../models/base-response';
import { CustomerNote } from '../../../../models/customer-note/customer-note.model';
import { QuoteCustomerNotesRef } from './customer-notes-store.model';

export interface QuoteCustomerNotesStoreState {
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly mutationError: BaseErrorResponse | null;
  readonly notes: CustomerNote[];
  readonly quote: QuoteCustomerNotesRef | null;
  /** Bumped by every write the backend accepted, so a host can tell the notes changed from a reload. */
  readonly savedChangeCount: number;
}

export const initialQuoteCustomerNotesState: QuoteCustomerNotesStoreState = {
  error: null,
  isLoading: false,
  isMutating: false,
  mutationError: null,
  notes: [],
  quote: null,
  savedChangeCount: 0,
};
