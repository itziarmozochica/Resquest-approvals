import type { Routes } from '@angular/router';

import { SalesRoutingGatewayComponent } from './containers/sales-routing-gateway/sales-routing-gateway.component';
import { SalesRoutingViewComponent } from './containers/sales-routing-view/sales-routing-view.component';
import { salesRoutingViewResolve } from './routing/sales-routing-view.resolve';
import { salesRoutingResolve } from './routing/sales-routing.resolve';
import { SalesRoutingComponent } from './sales-routing.component';
import { FzSalesRoutingService } from './services/sales-routing.service';
import { SalesRoutingStore } from './store/sales-routing.store';

export const salesRoutingGatewayRoutes: Routes = [
  {
    component: SalesRoutingGatewayComponent,
    path: '',
    pathMatch: 'full',
    resolve: { gateway: salesRoutingResolve },
  },
];

export const salesRoutingCrudRoutes: Routes = [
  {
    children: [
      {
        component: SalesRoutingViewComponent,
        path: '',
        pathMatch: 'full',
        resolve: { viewFlow: salesRoutingViewResolve },
      },
    ],
    component: SalesRoutingComponent,
    path: '',
    providers: [FzSalesRoutingService, SalesRoutingStore],
  },
];

export { salesRoutingCrudRoutes as salesRoutingListRoutes };
