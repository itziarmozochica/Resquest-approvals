import { computed, inject, untracked } from '@angular/core';

import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import type { OnsiteSetupVenueOption } from '../models/onsite-setup-option.model';
import type { OnsiteSetupQueryBase } from '../models/onsite-setup-query.model';
import type { OnsiteSetupsSummary } from '../models/onsite-setups-summary.model';
import { initialState, type OnsiteSetupStoreState } from '../models/store/onsite-setup-store.model';
import { TicketingOnsiteSetupService } from '../services/onsite-setup.service';
import { getVenueOptionsFromSummary, hasOnsiteSetups } from '../utils/onsite-setups-summary.util';

type SummaryRequestState = Pick<OnsiteSetupStoreState, 'isLoadingSummary' | 'summaryError'>;

function setSummaryPending(): SummaryRequestState {
  return { isLoadingSummary: true, summaryError: null };
}

function setSummaryError(error: unknown): SummaryRequestState {
  return { isLoadingSummary: false, summaryError: error };
}

function setSummarySuccess(): SummaryRequestState {
  return { isLoadingSummary: false, summaryError: null };
}

const onsiteSetupFeature = signalStoreFeature(
  withState<OnsiteSetupStoreState>(initialState),
  withComputed(({ onsiteSetupsSummary, selectionDismissed }) => ({
    hasAvailableOnsiteSetups: computed<boolean | null>(() => {
      const summary = onsiteSetupsSummary();

      return summary === null ? null : hasOnsiteSetups(summary);
    }),
    shouldAutoOpenSelector: computed<boolean>(() => {
      const summary = onsiteSetupsSummary();

      return summary === null ? false : hasOnsiteSetups(summary) && !selectionDismissed();
    }),
    venueOptions: computed<OnsiteSetupVenueOption[]>(() => {
      const summary = onsiteSetupsSummary();

      return summary === null ? [] : getVenueOptionsFromSummary(summary);
    }),
  })),
  withMethods((store, onsiteSetupService = inject(TicketingOnsiteSetupService)) => {
    const fetchOnsiteSetupsSummary = rxMethod<OnsiteSetupQueryBase>(
      pipe(
        switchMap((query: OnsiteSetupQueryBase) => {
          patchState(store, setSummaryPending(), {
            onsiteSetupsSummary: null,
            selectionDismissed: false,
          });

          return onsiteSetupService.getOnsiteSetupsSummary(query).pipe(
            tap((summary: OnsiteSetupsSummary) => {
              patchState(store, setSummarySuccess(), { onsiteSetupsSummary: summary });
            }),
            catchError((error: unknown) => {
              patchState(store, setSummaryError(error));

              return EMPTY;
            }),
          );
        }),
      ),
    );

    return {
      fetchOnsiteSetupsSummary,
      clearSelectionDismissed(): void {
        patchState(store, { selectionDismissed: false });
      },
      ensureSummaryLoaded(query: OnsiteSetupQueryBase): void {
        if (untracked(store.onsiteSetupsSummary) !== null || untracked(store.isLoadingSummary)) {
          return;
        }

        fetchOnsiteSetupsSummary(query);
      },
      markSelectionDismissed(): void {
        patchState(store, { selectionDismissed: true });
      },
    };
  }),
);

export type WithOnsiteSetupStoreFeature = typeof onsiteSetupFeature;

export function withOnsiteSetupStoreFeature(): WithOnsiteSetupStoreFeature {
  return onsiteSetupFeature;
}
