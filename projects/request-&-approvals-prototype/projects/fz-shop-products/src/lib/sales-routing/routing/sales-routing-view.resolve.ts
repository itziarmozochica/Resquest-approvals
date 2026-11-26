import { inject, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';

import { filter, map, of, switchMap, take, type Observable } from 'rxjs';

import { RetailSetupStore } from '../../retail/store/retail-setup.store';
import type { SalesRoutingViewFlow } from '../models/sales-routing-view-resolve.model';
import { SalesRoutingStore } from '../store/sales-routing.store';

export const salesRoutingViewResolve: ResolveFn<SalesRoutingViewFlow> = (route: ActivatedRouteSnapshot) => {
  const retailSetupStore = inject(RetailSetupStore);
  const salesRoutingStore = inject(SalesRoutingStore);
  const injector = inject(Injector);

  const retailSetupId = route.paramMap.get('retailSetupId');

  if (retailSetupId === null) {
    return 'emptySalesRouting';
  }

  retailSetupStore.setSelectedRetailSetupId(retailSetupId);

  const resolveSalesRoutingViewFlow = (): SalesRoutingViewFlow => {
    if (retailSetupStore.retailAction() === 'fetchByIdError' || salesRoutingStore.salesRoutingAction() === 'fetchError') {
      return 'salesRoutingError';
    }

    const salesRouting = salesRoutingStore.salesRouting();
    if (!salesRouting || salesRouting.plans.length === 0) {
      return 'emptySalesRouting';
    }

    return 'salesRoutingListView';
  };

  const fetchSalesRouting = (): Observable<SalesRoutingViewFlow> => {
    const salesRouting = salesRoutingStore.salesRouting();

    if (salesRouting !== null) {
      return of(salesRouting.plans.length === 0 ? 'emptySalesRouting' : 'salesRoutingListView');
    }

    salesRoutingStore.fetchSalesRouting({ retailSetupId });

    return toObservable(salesRoutingStore.salesRoutingAction, { injector }).pipe(
      filter(action => action === 'fetchError' || action === 'fetchSuccess'),
      take(1),
      map(() => resolveSalesRoutingViewFlow()),
    );
  };

  if (retailSetupStore.retailSetup() !== null) {
    return fetchSalesRouting();
  }

  retailSetupStore.fetchRetailSetupById(retailSetupId);

  return toObservable(retailSetupStore.retailAction, { injector }).pipe(
    filter(action => action === 'fetchByIdError' || action === 'fetchByIdSuccess'),
    take(1),
    switchMap(() => fetchSalesRouting()),
  );
};
