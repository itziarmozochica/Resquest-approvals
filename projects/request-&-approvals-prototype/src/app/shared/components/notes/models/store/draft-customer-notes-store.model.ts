import { BaseErrorResponse } from '../../../../models/base-response';
import { CustomerNote } from '../../../../models/customer-note/customer-note.model';

export interface DraftCustomerNotesStoreState {
  readonly draftSequence: number;
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly mutationError: BaseErrorResponse | null;
  readonly notes: CustomerNote[];
  /** The notes the draft started from (`seedNotes`), as stored on the record they came from. */
  readonly seededNotes: CustomerNote[];
  /** The quote the seeded notes are stored on; `null` when the draft was not started from a quote. */
  readonly seededQuoteId: string | null;
}

export const initialDraftCustomerNotesState: DraftCustomerNotesStoreState = {
  draftSequence: 0,
  error: null,
  isLoading: false,
  isMutating: false,
  mutationError: null,
  notes: [],
  seededNotes: [],
  seededQuoteId: null,
};

export const draftCustomerNoteIdPrefix = 'draft-';
