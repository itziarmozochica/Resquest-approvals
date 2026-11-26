import { computed, inject } from '@angular/core';

import { assertIsDefined } from '@fz/utils/assert-is-defined';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import { getRetailCurrencyOptions } from '../../core/models/retail-currency.model';
import type { RetailSetupType } from '../../core/models/retail-setup-type.model';
import { setError, setPending, setSuccess } from '../../core/utils/request-state.util';
import type { RetailSetupAccount } from '../models/retail-setup/retail-setup-account.model';
import type { RetailSetup, RetailSetupCreate, RetailSetupId, RetailSetupUpdate } from '../models/retail-setup/retail-setup.model';
import { initialState, type RetailSetupStoreState } from '../models/store/retail-setup-store.model';
import { FzRetailSetupService } from '../services/retail-setup.service';
import { withProductVariations } from './product-variations.feature';

type AccountsRequestState = Pick<RetailSetupStoreState, 'accountsError' | 'isLoadingAccounts'>;

function setAccountsPending(): AccountsRequestState {
  return { accountsError: null, isLoadingAccounts: true };
}

function setAccountsError(error: unknown): AccountsRequestState {
  return { accountsError: error, isLoadingAccounts: false };
}

function setAccountsSuccess(): AccountsRequestState {
  return { accountsError: null, isLoadingAccounts: false };
}

export const RetailSetupStore = signalStore(
  withState<RetailSetupStoreState>(initialState),
  withComputed(({ retailSetupDictionary, selectedRetailSetupId }) => ({
    retailSetup: computed(() => {
      const selectedId = selectedRetailSetupId();
      return selectedId === null ? null : (retailSetupDictionary()[selectedId] ?? null);
    }),
  })),
  withComputed(({ retailCurrencyDictionary, retailSetup }) => ({
    retailCurrencyOptions: computed(() => {
      const setup = retailSetup();
      if (setup === null) {
        return [];
      }
      return getRetailCurrencyOptions(retailCurrencyDictionary(), setup.type);
    }),
  })),
  withMethods((store, fzRetailSetupService = inject(FzRetailSetupService)) => ({
    createRetailSetup: rxMethod<RetailSetupCreate>(
      pipe(
        switchMap(retailSetup => {
          patchState(store, setPending());
          return fzRetailSetupService.createRetailSetup(retailSetup).pipe(
            tap((setup: RetailSetup | null) => {
              assertIsDefined(setup);
              patchState(store, setSuccess(), {
                availableRetailSetups: [...store.availableRetailSetups(), { id: setup.id, name: setup.name }],
                retailAction: 'createSuccess',
                retailSetupAccounts: [],
                retailSetupDictionary: { ...store.retailSetupDictionary(), [setup.id]: setup },
                selectedRetailOptionType: null,
                selectedRetailSetupId: setup.id,
              });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error), { retailAction: 'createError' });
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    fetchRetailSetupById: rxMethod<RetailSetupId>(
      pipe(
        switchMap(retailSetupId => {
          patchState(store, setPending(), { retailAction: null, selectedRetailSetupId: retailSetupId });
          return fzRetailSetupService.getRetailSetupById(retailSetupId).pipe(
            tap((setup: RetailSetup) => {
              const availableRetailSetups = store.availableRetailSetups();
              const isAlreadyAvailable = availableRetailSetups.some(availableSetup => availableSetup.id === setup.id);
              patchState(store, setSuccess(), {
                availableRetailSetups: isAlreadyAvailable
                  ? availableRetailSetups
                  : [...availableRetailSetups, { id: setup.id, name: setup.name }],
                retailAction: 'fetchByIdSuccess',
                retailSetupDictionary: { ...store.retailSetupDictionary(), [setup.id]: setup },
                // Re-assert: a concurrent fetchRetailSetups may have reset the selection while this request was in flight.
                selectedRetailSetupId: setup.id,
              });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error), { retailAction: 'fetchByIdError' });
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    fetchRetailSetupAccounts: rxMethod<RetailSetupType>(
      pipe(
        switchMap(type => {
          patchState(store, setAccountsPending());
          return fzRetailSetupService.getRetailSetupAccounts(type).pipe(
            tap((accounts: RetailSetupAccount[]) => {
              patchState(store, setAccountsSuccess(), { retailSetupAccounts: accounts });
            }),
            catchError((error: unknown) => {
              patchState(store, setAccountsError(error));
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    fetchRetailSetups: rxMethod<void>(
      pipe(
        switchMap(() => {
          patchState(store, setPending(), { retailAction: null });
          return fzRetailSetupService.getRetailSetups().pipe(
            tap((setups: RetailSetup[]) => {
              const selectedRetailSetupId = store.selectedRetailSetupId();
              const selectedStillExists = setups.some(setup => setup.id === selectedRetailSetupId);
              patchState(store, setSuccess(), {
                availableRetailSetups: setups.map(({ id, name }) => ({ id, name })),
                retailAction: 'fetchSuccess',
                selectedRetailSetupId: selectedStillExists ? selectedRetailSetupId : null,
              });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error), { retailAction: 'fetchError' });
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    syncRetailProducts: rxMethod<string>(
      pipe(
        switchMap(retailSetupId =>
          fzRetailSetupService.syncRetailProducts(retailSetupId).pipe(
            tap(() => {
              patchState(store, setSuccess(), { syncProductsAction: 'syncSuccess' });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error), { syncProductsAction: 'syncError' });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
    syncRetailProductsByPlans: rxMethod<string>(
      pipe(
        switchMap(retailSetupId =>
          fzRetailSetupService.syncRetailProductsByPlans(retailSetupId).pipe(
            tap(() => {
              patchState(store, setSuccess(), { syncProductsAction: 'syncByPlansSuccess' });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error), { syncProductsAction: 'syncByPlansError' });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
    updateRetail: rxMethod<{ changes: RetailSetupUpdate; retailSetupId: string }>(
      pipe(
        switchMap(({ changes, retailSetupId }) => {
          patchState(store, setPending());
          return fzRetailSetupService.updateRetailSetup(retailSetupId, changes).pipe(
            tap((setup: RetailSetup | null) => {
              assertIsDefined(setup);
              patchState(store, setSuccess(), {
                availableRetailSetups: store
                  .availableRetailSetups()
                  .map(availableSetup => (availableSetup.id === setup.id ? { id: setup.id, name: setup.name } : availableSetup)),
                retailAction: 'updateSuccess',
                retailSetupDictionary: {
                  ...store.retailSetupDictionary(),
                  [setup.id]: { ...store.retailSetupDictionary()[setup.id], ...setup },
                },
              });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error), { retailAction: 'updateError' });
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    clearAccountsError(): void {
      patchState(store, { accountsError: null });
    },
    clearError(): void {
      patchState(store, { error: null });
    },
    clearRetailAction(): void {
      patchState(store, { retailAction: null });
    },
    clearSelectedRetailOptionType(): void {
      patchState(store, { selectedRetailOptionType: null });
    },
    clearSyncProductsAction(): void {
      patchState(store, { syncProductsAction: null });
    },
    setSelectedRetailOptionType(optionType: RetailSetupType): void {
      patchState(store, { accountsError: null, selectedRetailOptionType: optionType });
    },
    setSelectedRetailSetupId(retailSetupId: RetailSetupId): void {
      patchState(store, { selectedRetailSetupId: retailSetupId });
    },
  })),
  withProductVariations(),
);
