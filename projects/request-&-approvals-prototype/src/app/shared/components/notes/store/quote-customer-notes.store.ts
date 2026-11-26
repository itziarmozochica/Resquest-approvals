import { inject } from '@angular/core';

import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, EMPTY, filter, finalize, Observable, pipe, switchMap, tap } from 'rxjs';

import { BaseErrorResponse } from '../../../models/base-response';
import { CustomerNote, CustomerNoteChanges } from '../../../models/customer-note/customer-note.model';
import { LeadQuoteCustomerNotesService } from '../../../services/lead/lead-quote-customer-notes/lead-quote-customer-notes.service';
import { PartnerService } from '../../../services/partner/partner.service';
import { QuoteCustomerNotesRef } from '../models/store/customer-notes-store.model';
import { initialQuoteCustomerNotesState } from '../models/store/quote-customer-notes-store.model';
import { isSameQuoteCustomerNotesRef } from '../utils/customer-notes.util';
import { setError, setPending, setSuccess } from '../utils/request-state.util';

export const QuoteCustomerNotesStore = signalStore(
  withState(initialQuoteCustomerNotesState),
  withMethods((store, leadQuoteCustomerNotesService = inject(LeadQuoteCustomerNotesService), partnerService = inject(PartnerService)) => {
    // Every write and read checks the quote is still the one on screen: the panel can be pointed at
    // another quote while a request is in flight, and its answer must not land on the new one.
    const isCurrent = (quote: QuoteCustomerNotesRef): boolean => isSameQuoteCustomerNotesRef(store.quote(), quote);

    const fetchNotes = (partnerId: number, quote: QuoteCustomerNotesRef): Observable<CustomerNote[]> =>
      leadQuoteCustomerNotesService.list(partnerId, quote.leadId, quote.quoteId).pipe(
        filter(() => isCurrent(quote)),
        tap((notes: CustomerNote[]) => patchState(store, setSuccess(), { notes })),
        catchError((error: unknown) => {
          if (isCurrent(quote)) {
            patchState(store, setError(error), { notes: [] });
          }
          return EMPTY;
        }),
      );

    const mutateThenRefresh = (mutation: (partnerId: number, quote: QuoteCustomerNotesRef) => Observable<unknown>): Observable<unknown> => {
      const partnerId = partnerService.getPartner()?.id;
      const quote = store.quote();
      if (partnerId == null || quote === null) {
        return EMPTY;
      }
      patchState(store, { isMutating: true, mutationError: null });
      return mutation(partnerId, quote).pipe(
        tap(() => {
          if (isCurrent(quote)) {
            patchState(store, { savedChangeCount: store.savedChangeCount() + 1 });
          }
        }),
        switchMap(() => fetchNotes(partnerId, quote)),
        catchError((error: BaseErrorResponse) => {
          if (isCurrent(quote)) {
            patchState(store, { mutationError: error });
          }
          return EMPTY;
        }),
        finalize(() => {
          if (isCurrent(quote)) {
            patchState(store, { isMutating: false });
          }
        }),
      );
    };

    return {
      clearMutationError(): void {
        patchState(store, { mutationError: null });
      },
      createNote: rxMethod<CustomerNoteChanges>(
        pipe(
          concatMap((changes: CustomerNoteChanges) =>
            mutateThenRefresh((partnerId, quote) => leadQuoteCustomerNotesService.create(partnerId, quote.leadId, quote.quoteId, changes)),
          ),
        ),
      ),
      deleteNote: rxMethod<string>(
        pipe(
          concatMap((noteId: string) =>
            mutateThenRefresh((partnerId, quote) => leadQuoteCustomerNotesService.delete(partnerId, quote.leadId, quote.quoteId, noteId)),
          ),
        ),
      ),
      loadNotes: rxMethod<QuoteCustomerNotesRef | null>(
        pipe(
          switchMap((quote: QuoteCustomerNotesRef | null) => {
            const partnerId = partnerService.getPartner()?.id;
            patchState(store, { isMutating: false, mutationError: null, notes: [], quote, savedChangeCount: 0 });
            if (partnerId == null || quote === null) {
              patchState(store, setSuccess());
              return EMPTY;
            }
            patchState(store, setPending());
            return fetchNotes(partnerId, quote);
          }),
        ),
      ),
      updateNote: rxMethod<{ changes: CustomerNoteChanges; noteId: string }>(
        pipe(
          concatMap(({ changes, noteId }) =>
            mutateThenRefresh((partnerId, quote) =>
              leadQuoteCustomerNotesService.update(partnerId, quote.leadId, quote.quoteId, noteId, changes),
            ),
          ),
        ),
      ),
    };
  }),
);
