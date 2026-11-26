import { inject } from '@angular/core';

import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { concat, concatMap, from, map, Observable, toArray } from 'rxjs';

import {
  CustomerNote,
  CustomerNoteAuthor,
  CustomerNoteChanges,
  CustomerNoteSync,
  CustomerNoteUpdate,
} from '../../../models/customer-note/customer-note.model';
import { LeadQuoteCustomerNotesService } from '../../../services/lead/lead-quote-customer-notes/lead-quote-customer-notes.service';
import { ReservationCustomerNotesService } from '../../../services/reservation/reservation-customer-notes/reservation-customer-notes.service';
import { UserService } from '../../../services/user/user.service';
import { draftCustomerNoteIdPrefix, initialDraftCustomerNotesState } from '../models/store/draft-customer-notes-store.model';
import { customerNoteSyncFor, toCustomerNoteChanges, toDraftCustomerNote, withDraftChanges } from '../utils/customer-notes.util';

export const DraftCustomerNotesStore = signalStore(
  withState(initialDraftCustomerNotesState),
  withMethods(
    (
      store,
      leadQuoteCustomerNotesService = inject(LeadQuoteCustomerNotesService),
      reservationCustomerNotesService = inject(ReservationCustomerNotesService),
      userService = inject(UserService),
    ) => {
      const currentAuthor = (): CustomerNoteAuthor => ({
        email: userService.getUserEmail() || null,
        fullName: userService.getUser()?.name || null,
        id: userService.getUserId() ?? null,
      });

      return {
        clearMutationError(): void {
          patchState(store, { mutationError: null });
        },
        createNote(changes: CustomerNoteChanges): void {
          const draftSequence = store.draftSequence() + 1;
          const note = toDraftCustomerNote(
            `${draftCustomerNoteIdPrefix}${draftSequence}`,
            changes,
            currentAuthor(),
            new Date().toISOString(),
          );
          patchState(store, { draftSequence, notes: [...store.notes(), note] });
        },
        deleteNote(noteId: string): void {
          patchState(store, { notes: store.notes().filter((note: CustomerNote) => note.id !== noteId) });
        },
        saveTo(partnerId: number, reservationId: string): Observable<void> {
          return from(store.notes()).pipe(
            concatMap((note: CustomerNote) =>
              reservationCustomerNotesService.create(partnerId, reservationId, toCustomerNoteChanges(note)),
            ),
            toArray(),
            map((): void => undefined),
          );
        },
        /**
         * Starts the draft from the notes stored on a quote, keeping their ids and authors, and remembers
         * them and their quote as stored: `syncToQuote` writes only what changed since, and only that
         * quote has those notes. On a new record they save like any drafted note: `saveTo` and the quote
         * request send them anew. `quoteId` is `null` when the draft no longer starts from any quote.
         */
        seedNotes(notes: readonly CustomerNote[], quoteId: string | null): void {
          patchState(store, { notes: [...notes], seededNotes: [...notes], seededQuoteId: quoteId });
        },
        /**
         * Brings the notes stored on an existing quote to the draft through the quote customer-note
         * endpoints: deletes, then edits, then creates, one request at a time. The draft started from
         * that quote's notes (`seedNotes`), so only what the coordinator changed is written.
         */
        syncToQuote(partnerId: number, leadId: string, quoteId: string): Observable<void> {
          const sync: CustomerNoteSync = customerNoteSyncFor(store.seededNotes(), store.notes());
          return concat(
            from(sync.deletes).pipe(
              concatMap((noteId: string) => leadQuoteCustomerNotesService.delete(partnerId, leadId, quoteId, noteId)),
            ),
            from(sync.updates).pipe(
              concatMap(({ changes, noteId }: CustomerNoteUpdate) =>
                leadQuoteCustomerNotesService.update(partnerId, leadId, quoteId, noteId, changes),
              ),
            ),
            from(sync.creates).pipe(
              concatMap((changes: CustomerNoteChanges) => leadQuoteCustomerNotesService.create(partnerId, leadId, quoteId, changes)),
            ),
          ).pipe(
            toArray(),
            map((): void => undefined),
          );
        },
        updateNote({ changes, noteId }: { changes: CustomerNoteChanges; noteId: string }): void {
          const author = currentAuthor();
          const at = new Date().toISOString();
          patchState(store, {
            notes: store.notes().map((note: CustomerNote) => (note.id === noteId ? withDraftChanges(note, changes, author, at) : note)),
          });
        },
      };
    },
  ),
);
