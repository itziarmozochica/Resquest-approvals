import { computed, inject } from '@angular/core';

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import { setError, setPending, setSuccess } from '../../core/utils/request-state.util';
import type { SalesRouting } from '../models/sales-routing.model';
import { initialState, type SalesRoutingStoreState } from '../models/store/sales-routing-store.model';
import { FzSalesRoutingService } from '../services/sales-routing.service';
import { salesRoutingFilterByQuery } from '../utils/sales-routing-filter-by-query';

export const SalesRoutingStore = signalStore(
  withState<SalesRoutingStoreState>(initialState),
  withComputed(({ salesRouting, searchQuery }) => ({
    filteredPlans: computed(() => {
      const routing = salesRouting();
      if (routing === null) {
        return [];
      }
      return salesRoutingFilterByQuery(routing.plans, searchQuery());
    }),
    retailSetupType: computed(() => salesRouting()?.retailSetupType ?? null),
  })),
  withMethods((store, fzSalesRoutingService = inject(FzSalesRoutingService)) => ({
    fetchSalesRouting: rxMethod<{ retailSetupId: string }>(
      pipe(
        switchMap(({ retailSetupId }) => {
          patchState(store, setPending(), { salesRouting: null, salesRoutingAction: null });
          return fzSalesRoutingService.getSalesRouting(retailSetupId).pipe(
            tap((salesRouting: SalesRouting | null) => {
              patchState(store, setSuccess(), { salesRouting, salesRoutingAction: 'fetchSuccess' });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error), { salesRoutingAction: 'fetchError' });
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    clearError(): void {
      patchState(store, { error: null });
    },
    clearSalesRoutingAction(): void {
      patchState(store, { salesRoutingAction: null });
    },
    setSearchQuery(query: string): void {
      patchState(store, { searchQuery: query });
    },
  })),
);
