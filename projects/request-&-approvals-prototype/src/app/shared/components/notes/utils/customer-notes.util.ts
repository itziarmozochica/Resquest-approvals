import { CustomerNote, CustomerNoteAuthor, CustomerNoteChanges, CustomerNoteSync } from '../../../models/customer-note/customer-note.model';
import { noteAudience, NoteAudienceET } from '../../../models/customer-note/note-audience.model';
import {
  CustomerNotesAccess,
  customerNotesSource,
  CustomerNotesSourceET,
  CustomerNotesSourceInputs,
  QuoteCustomerNotesRef,
} from '../models/store/customer-notes-store.model';
import { NoteInput } from '../notes-edit-form/notes-edit-form.component';

export function audiencesForNewNote(canAddInternalNote: boolean, canAddCustomerNote: boolean): NoteAudienceET[] {
  return [...(canAddInternalNote ? [noteAudience.Internal] : []), ...(canAddCustomerNote ? [noteAudience.Customer] : [])];
}

/** A panel pointed at a quote shows that quote's notes and nothing else, so the quote is decided first. */
export function customerNotesSourceFor(access: CustomerNotesAccess, inputs: CustomerNotesSourceInputs): CustomerNotesSourceET | null {
  if (inputs.quote !== null) {
    return access.isQuoteCustomerNotesEnabled ? customerNotesSource.Quote : null;
  }
  if (!access.canManageCustomerNotes) {
    return null;
  }
  if (inputs.draft) {
    return customerNotesSource.Draft;
  }
  if (inputs.reservationId !== null) {
    return customerNotesSource.Reservation;
  }
  return inputs.orderId !== null ? customerNotesSource.Order : null;
}

/** The newest change among the notes, as the backend stamped it (`updatedAt ?? createdAt`); `null` with none. */
export function latestCustomerNoteChangeAt(notes: readonly CustomerNote[]): string | null {
  return notes.reduce<string | null>((latest: string | null, note: CustomerNote) => {
    const changedAt = note.updatedAt ?? note.createdAt;
    return latest === null || Date.parse(changedAt) > Date.parse(latest) ? changedAt : latest;
  }, null);
}

export function isSameQuoteCustomerNotesRef(left: QuoteCustomerNotesRef | null, right: QuoteCustomerNotesRef | null): boolean {
  return left?.leadId === right?.leadId && left?.quoteId === right?.quoteId;
}

/** The quote whose notes a panel reads, once both of its ids are known. */
export function toQuoteCustomerNotesRef(leadId: string | null, quoteId: string | null): QuoteCustomerNotesRef | null {
  return leadId !== null && quoteId !== null ? { leadId, quoteId } : null;
}

export function toDraftCustomerNote(id: string, changes: CustomerNoteChanges, author: CustomerNoteAuthor, at: string): CustomerNote {
  return {
    createdAt: at,
    createdBy: author,
    id,
    message: changes.message,
    title: changes.title,
    updatedAt: null,
    updatedBy: null,
  };
}

/** The part of a note a create request carries: what the guest reads, without the authoring stamps. */
export function toCustomerNoteChanges(note: CustomerNote): CustomerNoteChanges {
  return { message: note.message, title: note.title };
}

/**
 * The writes that turn the notes stored on a record into the draft. A note kept by id is updated when
 * its title or message changed. A note the draft dropped and a note it added pair up as an update of
 * the stored note, which keeps its id: the notes panel holds one customer note, so replacing it is
 * editing it. Whatever does not pair is created or deleted.
 */
export function customerNoteSyncFor(stored: readonly CustomerNote[], draft: readonly CustomerNote[]): CustomerNoteSync {
  const storedById = new Map(stored.map((note: CustomerNote): [string, CustomerNote] => [note.id, note]));
  const draftIds = new Set(draft.map((note: CustomerNote) => note.id));
  const added = draft.filter((note: CustomerNote) => !storedById.has(note.id));
  const removed = stored.filter((note: CustomerNote) => !draftIds.has(note.id));
  const edited = draft.filter((note: CustomerNote) => {
    const storedNote = storedById.get(note.id);
    return storedNote !== undefined && (storedNote.message !== note.message || storedNote.title !== note.title);
  });
  const replacements = added.slice(0, removed.length);

  return {
    creates: added.slice(removed.length).map((note: CustomerNote) => toCustomerNoteChanges(note)),
    deletes: removed.slice(added.length).map((note: CustomerNote) => note.id),
    updates: [
      ...edited.map((note: CustomerNote) => ({ changes: toCustomerNoteChanges(note), noteId: note.id })),
      ...replacements.map((note: CustomerNote, index: number) => ({ changes: toCustomerNoteChanges(note), noteId: removed[index].id })),
    ],
  };
}

export function withDraftChanges(note: CustomerNote, changes: CustomerNoteChanges, author: CustomerNoteAuthor, at: string): CustomerNote {
  return {
    ...note,
    message: changes.message,
    title: changes.title,
    updatedAt: at,
    updatedBy: author,
  };
}

export function toCustomerNoteInput(note: CustomerNote): NoteInput {
  const lastAuthor = note.updatedBy ?? note.createdBy;
  return {
    id: note.id,
    message: note.message,
    modified_at: note.updatedAt ?? note.createdAt,
    title: note.title,
    username: lastAuthor.fullName || lastAuthor.email,
  };
}
