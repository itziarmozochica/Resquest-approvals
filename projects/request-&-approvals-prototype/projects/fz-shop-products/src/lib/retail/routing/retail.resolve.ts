import { inject, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';

import { filter, map, take } from 'rxjs';

import type { RetailGateway } from '../models/retail-gateway-resolve.model';
import { RetailSetupStore } from '../store/retail-setup.store';

function redirectToRetailView(router: Router, retailSetupId: string): RedirectCommand {
  const urlTree = router.createUrlTree(['/', 'products', 'catalog-integrations', retailSetupId]);
  return new RedirectCommand(urlTree);
}

/**This method is used to fetch the retail setups and redirect to the retail view, the create retail flow or the error state. */
export const retailResolve: ResolveFn<RetailGateway | RedirectCommand> = () => {
  const store = inject(RetailSetupStore);
  const router = inject(Router);
  const injector = inject(Injector);

  const existingSetup = store.retailSetup();
  if (existingSetup !== null) {
    return redirectToRetailView(router, existingSetup.id);
  }

  store.fetchRetailSetups();

  return toObservable(store.retailAction, { injector }).pipe(
    filter(action => ['fetchError', 'fetchSuccess'].includes(action as string)),
    take(1),
    map((retailAction): RetailGateway | RedirectCommand => {
      if (retailAction === 'fetchError') {
        return 'retailsError';
      }
      const availableRetailSetups = store.availableRetailSetups();
      if (availableRetailSetups.length > 0) {
        return redirectToRetailView(router, store.selectedRetailSetupId() ?? availableRetailSetups[0].id);
      }
      return 'createRetail';
    }),
  );
};
