import { inject, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';

import { filter, map, take } from 'rxjs';

import type { RetailViewFlow } from '../models/retail-view-resolve.model';
import { RetailSetupStore } from '../store/retail-setup.store';

/**This resolver decides the retail view flow: render the routed catalog's details, or the error state when its fetch failed. */
export const retailViewResolve: ResolveFn<RetailViewFlow> = (route: ActivatedRouteSnapshot) => {
  const store = inject(RetailSetupStore);
  const injector = inject(Injector);

  const catalogId = route.paramMap.get('catalogId');
  if (catalogId === null) {
    return 'retailError';
  }

  store.setSelectedRetailSetupId(catalogId);

  if (store.availableRetailSetups().length === 0) {
    // Fire-and-forget list warm-up for the setup selector; viewFlow ignores it.
    store.fetchRetailSetups();
  }

  if (store.retailSetup() !== null) {
    store.clearRetailAction();
    store.clearError();
    return 'retailDetailsView';
  }

  store.fetchRetailSetupById(catalogId);

  return toObservable(store.retailAction, { injector }).pipe(
    // The retailSetup check also matches when the concurrent list fetch overwrites 'fetchByIdSuccess' in the same flush.
    filter(action => action === 'fetchByIdError' || store.retailSetup() !== null),
    take(1),
    // Decide from state, not the action string: a late list response may overwrite retailAction, but only the detail fetch fills the dictionary.
    map((): RetailViewFlow => (store.retailSetup() === null ? 'retailError' : 'retailDetailsView')),
  );
};
