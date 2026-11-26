import { Signal } from '@angular/core';

import { BaseErrorResponse } from '../../../../models/base-response';
import { CustomerNote, CustomerNoteChanges } from '../../../../models/customer-note/customer-note.model';

export interface CustomerNotesStoreContract {
  readonly error: Signal<unknown>;
  readonly isLoading: Signal<boolean>;
  readonly isMutating: Signal<boolean>;
  readonly mutationError: Signal<BaseErrorResponse | null>;
  readonly notes: Signal<CustomerNote[]>;
  clearMutationError(): void;
  createNote(changes: CustomerNoteChanges): void;
  deleteNote(noteId: string): void;
  updateNote(update: { changes: CustomerNoteChanges; noteId: string }): void;
}

export const customerNotesSource = {
  Draft: 'DRAFT',
  Order: 'ORDER',
  Quote: 'QUOTE',
  Reservation: 'RESERVATION',
} as const;

export type CustomerNotesSourceET = (typeof customerNotesSource)[keyof typeof customerNotesSource];

/** A quote's notes live under its lead, so both ids address them. */
export interface QuoteCustomerNotesRef {
  leadId: string;
  quoteId: string;
}

export interface CustomerNotesSourceInputs {
  draft: boolean;
  orderId: number | null;
  quote: QuoteCustomerNotesRef | null;
  reservationId: string | null;
}

/**
 * Who may see customer notes where. A reservation, its orders and the wizard draft take the
 * reservation write permissions. A quote's notes only need the feature: the lead page that shows
 * them already requires `can_view_leads`, and whether they can change is the host's call.
 */
export interface CustomerNotesAccess {
  canManageCustomerNotes: boolean;
  isQuoteCustomerNotesEnabled: boolean;
}
