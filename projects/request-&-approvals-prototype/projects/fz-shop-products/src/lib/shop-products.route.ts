import type { Routes } from '@angular/router';

import { PermissionBasedGuard } from '@fz-original/app/shared/guard/permission-based/permission-based.guard';

import { SALES_ROUTING_PERMISSIONS, SHOP_PRODUCT_PERMISSIONS } from './core/permissions/permission';
import { RetailSetupStore } from './retail/store/retail-setup.store';

export const shopProductsRoutes: Routes = [
  {
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalog-integrations' },
      {
        canActivate: [PermissionBasedGuard],
        data: {
          permission: SHOP_PRODUCT_PERMISSIONS,
        },
        path: 'catalog-integrations',
        loadChildren: async () => import('./retail/retail.routes').then(mod => mod.retailRoutes),
      },
      {
        canActivate: [PermissionBasedGuard],
        data: {
          permission: SALES_ROUTING_PERMISSIONS,
        },
        path: 'sales-routing',
        loadChildren: async () => import('./sales-routing/sales-routing.routes').then(mod => mod.salesRoutingGatewayRoutes),
      },
      {
        canActivate: [PermissionBasedGuard],
        data: {
          permission: SALES_ROUTING_PERMISSIONS,
        },
        path: ':retailSetupId/sales-routing',
        loadChildren: async () => import('./sales-routing/sales-routing.routes').then(mod => mod.salesRoutingListRoutes),
      },
    ],
    path: '',
    providers: [RetailSetupStore],
  },
];
