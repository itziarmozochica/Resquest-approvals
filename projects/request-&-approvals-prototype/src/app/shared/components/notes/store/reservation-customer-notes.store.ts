import { inject } from '@angular/core';

import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, EMPTY, filter, finalize, Observable, pipe, switchMap, tap } from 'rxjs';

import { BaseErrorResponse } from '../../../models/base-response';
import { CustomerNote, CustomerNoteChanges } from '../../../models/customer-note/customer-note.model';
import { PartnerService } from '../../../services/partner/partner.service';
import { ReservationCustomerNotesService } from '../../../services/reservation/reservation-customer-notes/reservation-customer-notes.service';
import { initialReservationCustomerNotesState } from '../models/store/reservation-customer-notes-store.model';
import { setError, setPending, setSuccess } from '../utils/request-state.util';

export const ReservationCustomerNotesStore = signalStore(
  withState(initialReservationCustomerNotesState),
  withMethods(
    (store, reservationCustomerNotesService = inject(ReservationCustomerNotesService), partnerService = inject(PartnerService)) => {
      const fetchNotes = (partnerId: number, reservationId: string): Observable<CustomerNote[]> =>
        reservationCustomerNotesService.list(partnerId, reservationId).pipe(
          filter(() => store.reservationId() === reservationId),
          tap((notes: CustomerNote[]) => patchState(store, setSuccess(), { notes })),
          catchError((error: unknown) => {
            if (store.reservationId() === reservationId) {
              patchState(store, setError(error), { notes: [] });
            }
            return EMPTY;
          }),
        );

      const mutateThenRefresh = (mutation: (partnerId: number, reservationId: string) => Observable<unknown>): Observable<unknown> => {
        const partnerId = partnerService.getPartner()?.id;
        const reservationId = store.reservationId();
        if (partnerId == null || reservationId === null) {
          return EMPTY;
        }
        patchState(store, { isMutating: true, mutationError: null });
        return mutation(partnerId, reservationId).pipe(
          switchMap(() => fetchNotes(partnerId, reservationId)),
          catchError((error: BaseErrorResponse) => {
            if (store.reservationId() === reservationId) {
              patchState(store, { mutationError: error });
            }
            return EMPTY;
          }),
          finalize(() => {
            if (store.reservationId() === reservationId) {
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
              mutateThenRefresh((partnerId, reservationId) => reservationCustomerNotesService.create(partnerId, reservationId, changes)),
            ),
          ),
        ),
        deleteNote: rxMethod<string>(
          pipe(
            concatMap((noteId: string) =>
              mutateThenRefresh((partnerId, reservationId) => reservationCustomerNotesService.delete(partnerId, reservationId, noteId)),
            ),
          ),
        ),
        loadNotes: rxMethod<string | null>(
          pipe(
            switchMap((reservationId: string | null) => {
              const partnerId = partnerService.getPartner()?.id;
              patchState(store, { isMutating: false, mutationError: null, notes: [], reservationId });
              if (partnerId == null || reservationId === null) {
                patchState(store, setSuccess());
                return EMPTY;
              }
              patchState(store, setPending());
              return fetchNotes(partnerId, reservationId);
            }),
          ),
        ),
        updateNote: rxMethod<{ changes: CustomerNoteChanges; noteId: string }>(
          pipe(
            concatMap(({ changes, noteId }) =>
              mutateThenRefresh((partnerId, reservationId) =>
                reservationCustomerNotesService.update(partnerId, reservationId, noteId, changes),
              ),
            ),
          ),
        ),
      };
    },
  ),
);
