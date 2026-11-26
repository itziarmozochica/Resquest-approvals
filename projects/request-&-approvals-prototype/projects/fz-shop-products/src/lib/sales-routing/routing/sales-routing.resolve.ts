import { inject, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';

import { filter, map, take } from 'rxjs';

import { RetailSetupStore } from '../../retail/store/retail-setup.store';
import type { SalesRoutingGateway } from '../models/sales-routing-gateway-resolve.model';

function redirectToSalesRouting(router: Router, retailSetupId: string): RedirectCommand {
  return new RedirectCommand(router.createUrlTree(['/', 'products', retailSetupId, 'sales-routing']));
}

export const salesRoutingResolve: ResolveFn<SalesRoutingGateway | RedirectCommand> = () => {
  const store = inject(RetailSetupStore);
  const router = inject(Router);
  const injector = inject(Injector);

  const existingSetup = store.retailSetup();
  if (existingSetup !== null) {
    return redirectToSalesRouting(router, existingSetup.id);
  }

  store.fetchRetailSetups();

  return toObservable(store.retailAction, { injector }).pipe(
    filter(action => ['fetchError', 'fetchSuccess'].includes(action as string)),
    take(1),
    map((retailAction): SalesRoutingGateway | RedirectCommand => {
      if (retailAction === 'fetchError') {
        return 'retailSetupError';
      }
      const availableRetailSetups = store.availableRetailSetups();
      if (availableRetailSetups.length > 0) {
        return redirectToSalesRouting(router, store.selectedRetailSetupId() ?? availableRetailSetups[0].id);
      }
      return 'emptyRetailSetup';
    }),
  );
};
