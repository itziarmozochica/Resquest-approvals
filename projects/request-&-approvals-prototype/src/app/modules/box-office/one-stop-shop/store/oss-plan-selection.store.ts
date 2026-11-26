import { computed } from '@angular/core';

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import {
  initialState,
  type OssPlanSelectionStoreState,
  type OssTicketSelectorPlaceholder,
} from '../models/store/oss-plan-selection-store.model';

export const OssPlanSelectionStore = signalStore(
  withState<OssPlanSelectionStoreState>(initialState),
  withComputed(({ hasAvailablePlans, selectionDismissed }) => ({
    shouldShowPlanPlaceSelector: computed(() => hasAvailablePlans() === true),
    shouldAutoOpenPlanPlaceSelector: computed(() => hasAvailablePlans() === true && !selectionDismissed()),
    ticketSelectorPlaceholder: computed((): OssTicketSelectorPlaceholder => {
      if (hasAvailablePlans() === null) {
        return 'loading';
      }
      if (hasAvailablePlans() === false) {
        return 'noPlans';
      }
      if (selectionDismissed()) {
        return 'noSelection';
      }
      return 'awaitingSelection';
    }),
  })),
  withMethods(store => ({
    clearSelectionDismissed(): void {
      patchState(store, { selectionDismissed: false });
    },
    markSelectionDismissed(): void {
      patchState(store, { selectionDismissed: true });
    },
    resetPlanAvailability(): void {
      patchState(store, { hasAvailablePlans: null, selectionDismissed: false });
    },
    setHasAvailablePlans(hasAvailablePlans: boolean): void {
      patchState(store, { hasAvailablePlans });
    },
  })),
);
