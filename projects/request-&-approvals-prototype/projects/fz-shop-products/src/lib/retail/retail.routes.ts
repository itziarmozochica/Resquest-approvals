import type { Routes } from '@angular/router';

import { RetailGatewayComponent } from './containers/retail-gateway/retail-gateway.component';
import { RetailViewComponent } from './containers/retail-view/retail-view.component';
import { RetailShellComponent } from './retail-shell.component';
import { retailViewResolve } from './routing/retail-view.resolve';
import { retailResolve } from './routing/retail.resolve';

export const retailRoutes: Routes = [
  {
    children: [
      {
        component: RetailGatewayComponent,
        path: '',
        pathMatch: 'full',
        resolve: { gateway: retailResolve },
      },
      {
        component: RetailViewComponent,
        path: ':catalogId',
        resolve: { viewFlow: retailViewResolve },
      },
    ],
    component: RetailShellComponent,
    path: '',
  },
];
