import { inject } from '@angular/core';

import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, EMPTY, filter, finalize, Observable, pipe, switchMap, tap } from 'rxjs';

import { BaseErrorResponse } from '../../../models/base-response';
import { CustomerNote, CustomerNoteChanges } from '../../../models/customer-note/customer-note.model';
import { OrderCustomerNotesService } from '../../../services/order/order-customer-notes/order-customer-notes.service';
import { PartnerService } from '../../../services/partner/partner.service';
import { initialOrderCustomerNotesState } from '../models/store/order-customer-notes-store.model';
import { setError, setPending, setSuccess } from '../utils/request-state.util';

export const OrderCustomerNotesStore = signalStore(
  withState(initialOrderCustomerNotesState),
  withMethods((store, orderCustomerNotesService = inject(OrderCustomerNotesService), partnerService = inject(PartnerService)) => {
    // A refresh after a mutation is not cancelled by a tab switch, so drop it once another order is shown.
    const fetchNotes = (partnerId: number, orderId: number): Observable<CustomerNote[]> =>
      orderCustomerNotesService.list(partnerId, orderId).pipe(
        filter(() => store.orderId() === orderId),
        tap((notes: CustomerNote[]) => patchState(store, setSuccess(), { notes })),
        catchError((error: unknown) => {
          if (store.orderId() === orderId) {
            patchState(store, setError(error), { notes: [] });
          }
          return EMPTY;
        }),
      );

    const mutateThenRefresh = (mutation: (partnerId: number, orderId: number) => Observable<unknown>): Observable<unknown> => {
      const partnerId = partnerService.getPartner()?.id;
      const orderId = store.orderId();
      if (partnerId == null || orderId === null) {
        return EMPTY;
      }
      patchState(store, { isMutating: true, mutationError: null });
      return mutation(partnerId, orderId).pipe(
        switchMap(() => fetchNotes(partnerId, orderId)),
        catchError((error: BaseErrorResponse) => {
          if (store.orderId() === orderId) {
            patchState(store, { mutationError: error });
          }
          return EMPTY;
        }),
        finalize(() => {
          if (store.orderId() === orderId) {
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
            mutateThenRefresh((partnerId, orderId) => orderCustomerNotesService.create(partnerId, orderId, changes)),
          ),
        ),
      ),
      deleteNote: rxMethod<string>(
        pipe(
          concatMap((noteId: string) =>
            mutateThenRefresh((partnerId, orderId) => orderCustomerNotesService.delete(partnerId, orderId, noteId)),
          ),
        ),
      ),
      loadNotes: rxMethod<number | null>(
        pipe(
          switchMap((orderId: number | null) => {
            const partnerId = partnerService.getPartner()?.id;
            patchState(store, { isMutating: false, mutationError: null, notes: [], orderId });
            if (partnerId == null || orderId === null) {
              patchState(store, setSuccess());
              return EMPTY;
            }
            patchState(store, setPending());
            return fetchNotes(partnerId, orderId);
          }),
        ),
      ),
      updateNote: rxMethod<{ changes: CustomerNoteChanges; noteId: string }>(
        pipe(
          concatMap(({ changes, noteId }) =>
            mutateThenRefresh((partnerId, orderId) => orderCustomerNotesService.update(partnerId, orderId, noteId, changes)),
          ),
        ),
      ),
    };
  }),
);
