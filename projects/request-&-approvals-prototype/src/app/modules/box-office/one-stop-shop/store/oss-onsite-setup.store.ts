import { computed, inject } from '@angular/core';

import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { setError, setPending, setSuccess } from '@fz-shop-products/src/lib/core/utils/request-state.util';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import { initialState, type OssOnsiteSetupStoreState, type TicketSelectorPlaceholder } from '../models/store/oss-onsite-setup-store.model';
import { getPlaceOptionsFromSummary, hasOnsiteSetups } from '../utils/onsite-setups-summary.util';

export const OssOnsiteSetupStore = signalStore(
  withState<OssOnsiteSetupStoreState>(initialState),
  withComputed(({ isLoading, onsiteSetupsSummary, selectionDismissed }) => ({
    hasAvailableOnsiteSetups: computed((): boolean | null => {
      const currentOnsiteSetupsSummary = onsiteSetupsSummary();
      if (currentOnsiteSetupsSummary === null) {
        return null;
      }
      return hasOnsiteSetups(currentOnsiteSetupsSummary);
    }),
    placeOptions: computed(() => {
      const currentOnsiteSetupsSummary = onsiteSetupsSummary();
      if (currentOnsiteSetupsSummary === null) {
        return [];
      }
      return getPlaceOptionsFromSummary(currentOnsiteSetupsSummary);
    }),
    shouldAutoOpenSelector: computed(() => {
      const currentOnsiteSetupsSummary = onsiteSetupsSummary();
      if (currentOnsiteSetupsSummary === null) {
        return false;
      }
      return hasOnsiteSetups(currentOnsiteSetupsSummary) && !selectionDismissed();
    }),
    ticketSelectorPlaceholder: computed((): TicketSelectorPlaceholder => {
      if (isLoading()) {
        return 'loading';
      }
      const currentOnsiteSetupsSummary = onsiteSetupsSummary();
      if (currentOnsiteSetupsSummary !== null && !hasOnsiteSetups(currentOnsiteSetupsSummary)) {
        return 'noSetups';
      }
      if (selectionDismissed()) {
        return 'noSelection';
      }
      return 'loading';
    }),
  })),
  withMethods((store, onsiteSetupsService = inject(OnsiteSetupsService)) => {
    const fetchAvailableOnsiteSetups = rxMethod<void>(
      pipe(
        switchMap(() => {
          patchState(store, setPending(), { onsiteSetupsSummary: null, selectionDismissed: false });
          return onsiteSetupsService.getOnsiteSetupsSummary().pipe(
            tap(fetchedOnsiteSetupsSummary => {
              patchState(store, setSuccess(), { onsiteSetupsSummary: fetchedOnsiteSetupsSummary });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error));
              return EMPTY;
            }),
          );
        }),
      ),
    );

    return {
      fetchAvailableOnsiteSetups,
      clearSelectionDismissed(): void {
        patchState(store, { selectionDismissed: false });
      },
      ensureSummaryLoaded(): void {
        if (store.onsiteSetupsSummary() !== null || store.isLoading()) {
          return;
        }
        fetchAvailableOnsiteSetups();
      },
      markSelectionDismissed(): void {
        patchState(store, { selectionDismissed: true });
      },
    };
  }),
);
