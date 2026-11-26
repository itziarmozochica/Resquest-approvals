import { inject, NgModule } from '@angular/core';
import { CanActivateFn, Route, Router, RouterModule, ROUTES, Routes } from '@angular/router';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { environment } from '@fz-original/environments/environment';
import { OnsiteSetupStore, provideTicketing, withAvailabilityCache, withOnsiteSetup } from '@fz/ticketing';
import { FZT_ONSITE_SETUP_TRANSLATIONS } from '@fz/ticketing-ui';

import { provideIgniteTranslations } from '../../core/factories/provide-ignite-translations';
import { hasUnsavedChangesGuard } from '../../shared/guard/has-unsaved-changes/has-unsaved-changes.guard';
import { PermissionBasedGuard } from '../../shared/guard/permission-based/permission-based.guard';
import { HasOptimizelyPermissionGuard } from '../../shared/optimizely/has-optimizely-permission.guard';
import { OptimizelyFeatureKeyDef } from '../../shared/optimizely/optimizely-feature-key';
import { OptimizelyService } from '../../shared/optimizely/optimizely.service';
import { OrderResolver } from '../../shared/resolvers/order.resolver';
import { UserService } from '../../shared/services/user/user.service';
import { canActivateDualScreen } from './auto-diagnose/guards/dual-screen.guard';
import { CheckoutResolver } from './checkout.resolver';
import { CheckoutComponent } from './checkout/checkout.component';
import { BoxOfficeCustomTabsComponent } from './custom-tabs/custom-tabs.component';
import { OnsiteSetupCustomTabsResolver } from './custom-tabs/custom-tabs.resolver';
import { fztOnsiteSetupTranslationsFactory } from './odoo-food-and-beverage/factories/fzt-onsite-setup-translations.factory';
import { odooFoodAndBeverageResolver } from './odoo-food-and-beverage/resolvers/odoo-food-and-beverage.resolver';
import { OrderComponent } from './order/order.component';
import { venueScopedFlagGuard } from './point-of-sale/guards/venue-scoped-flag.guard';
import { POS_TICKET_SELECTOR_REARCHITECT } from './point-of-sale/tokens/pos-ticket-selector-rearchitect.token';
import { PurchasedCartComponent } from './purchased-cart/purchased-cart.component';
import { PurchasedCartResolver } from './purchased-cart/purchased-cart.resolver';
import { SalesSummaryComponent } from './sales-summary/sales-summary.component';
import { OboSettingsComponent } from './settings/obo-settings.component';
import { settingsTrackingProvider } from './settings/tracking/settings.tracking-provider';
import { ShiftResolver } from './shift.resolver';
import { ShiftComponent } from './shift/shift.component';
import { shiftTrackingProvider } from './shift/tracking/shift.tracking-provider';
import { ShiftsListComponent } from './shifts-list/shifts-list.component';

export const canActivateBoxOfficeStats: CanActivateFn = (): boolean => {
  const optimizelyService: OptimizelyService = inject(OptimizelyService);
  const router: Router = inject(Router);
  const isHidden = optimizelyService.isFeatureEnabled(FeatureFlags.HIDE_BOX_OFFICE_STATS_VIEW) ?? false;

  if (isHidden) {
    router.navigate(['/plans']);
    return false;
  }

  return true;
};

/**
 * The parent `/box-office` route also admits the read-only Box Office roles so their own pages
 * (`shifts-list`, `sales-summary`, `cash-register-reports`) can be reached. Selling needs its own
 * check because none of those roles is authorized to open a shift or read the onsite setup. It
 * covers the ticketing pages and the checkout, order and purchased-cart pages they hand off to,
 * which render the shift controls too.
 */
const sellingPermissions = {
  canActivate: [PermissionBasedGuard],
  data: {
    permission: [Permissions.CAN_VIEW_BOX_OFFICE, Permissions.CAN_MANAGE_STOCK],
  },
};

const pointOfSaleRoute: Route = {
  path: '',
  pathMatch: 'full',
  loadComponent: () => import('./point-of-sale/containers/point-of-sale/point-of-sale.component').then(m => m.PointOfSaleComponent),
  canDeactivate: [hasUnsavedChangesGuard],
  ...sellingPermissions,
  data: { ...sellingPermissions.data, preloadOnOnsiteDevice: true },
};

const ticketSelectorRearchitectFlag: OptimizelyFeatureKeyDef = {
  optimizelyFeatureKey: FeatureFlags.POS_TICKET_SELECTOR_REARCHITECT,
  team: 'b2b-shops',
};

const routes: Routes = [
  {
    ...pointOfSaleRoute,
    canMatch: [venueScopedFlagGuard(ticketSelectorRearchitectFlag)],
    providers: [{ provide: POS_TICKET_SELECTOR_REARCHITECT, useValue: true }],
  },
  {
    ...pointOfSaleRoute,
    providers: [{ provide: POS_TICKET_SELECTOR_REARCHITECT, useValue: false }],
  },
  {
    path: 'odoo-food-and-beverage',
    loadComponent: () =>
      import('./odoo-food-and-beverage/containers/odoo-food-and-beverage/odoo-food-and-beverage.component').then(
        m => m.OdooFoodAndBeverageComponent,
      ),
    canActivate: [HasOptimizelyPermissionGuard, PermissionBasedGuard],
    data: {
      permission: [Permissions.CAN_VIEW_BOX_OFFICE, Permissions.CAN_MANAGE_STOCK],
      module: FeatureFlags.CAN_VIEW_ODOO_POS_SUBSECTION,
    },
    resolve: {
      redirect: odooFoodAndBeverageResolver,
    },
  },
  {
    path: 'checkout/:cartId',
    component: CheckoutComponent,
    resolve: {
      checkoutData: CheckoutResolver,
    },
    ...sellingPermissions,
  },
  {
    path: 'checkout/:cartId/:reservationId',
    component: CheckoutComponent,
    resolve: {
      checkoutData: CheckoutResolver,
    },
    ...sellingPermissions,
  },
  {
    path: 'order/:orderId',
    component: OrderComponent,
    resolve: {
      orderData: OrderResolver,
    },
    ...sellingPermissions,
  },
  {
    path: 'purchased-cart/:cartId',
    component: PurchasedCartComponent,
    resolve: {
      purchasedCartData: PurchasedCartResolver,
    },
    ...sellingPermissions,
  },
  {
    path: 'sales-summary',
    component: SalesSummaryComponent,
    canActivate: [canActivateBoxOfficeStats, PermissionBasedGuard],
    data: {
      permission: 'can_view_box_office_stats',
    },
  },
  {
    path: 'settings',
    component: OboSettingsComponent,
    canActivate: [PermissionBasedGuard],
    providers: [...settingsTrackingProvider()],
    children: [
      {
        path: 'payment-configurations/new',
        loadComponent: () =>
          import('./settings/containers/payment-configuration-editor-page/payment-configuration-editor-page.component').then(
            m => m.PaymentConfigurationEditorPageComponent,
          ),
      },
      {
        path: 'payment-configurations/:configurationId',
        loadComponent: () =>
          import('./settings/containers/payment-configuration-editor-page/payment-configuration-editor-page.component').then(
            m => m.PaymentConfigurationEditorPageComponent,
          ),
      },
    ],
    data: {
      permission: 'can_manage_onsite_setups',
    },
  },
  {
    path: 'settings/:onsiteSetupId/custom-tabs',
    component: BoxOfficeCustomTabsComponent,
    canActivate: [PermissionBasedGuard],
    canDeactivate: [hasUnsavedChangesGuard],
    resolve: {
      customTabs: OnsiteSetupCustomTabsResolver,
    },
    data: {
      permission: 'can_manage_onsite_setups',
    },
  },
  {
    canActivate: [canActivateDualScreen, PermissionBasedGuard],
    data: {
      permission: Permissions.CAN_EXECUTE_HARDWARE_AUTODIAGNOSE,
    },
    path: 'auto-diagnose',
    loadComponent: () => import('./auto-diagnose/containers/auto-diagnose/auto-diagnose.component').then(m => m.AutoDiagnoseComponent),
  },
  {
    path: 'cash-register-reports',
    loadComponent: () => import('./cash-register-reports/cash-register-reports.component').then(m => m.CashRegisterReportsComponent),
    canActivate: [PermissionBasedGuard],
    data: {
      permission: Permissions.CAN_MANAGE_CASH_REGISTER_REPORTS,
    },
  },
];

function getRoutesWithShifts(permission: string, baseRoutes = routes): Routes {
  const shiftRoutesCommon = {
    canActivate: [PermissionBasedGuard],
    data: {
      permission: permission,
    },
  };

  return [
    ...baseRoutes,
    {
      path: 'shifts-list',
      component: ShiftsListComponent,
      ...shiftRoutesCommon,
    },
    {
      path: 'shift/:shiftId',
      component: ShiftComponent,
      providers: [...shiftTrackingProvider()],
      resolve: {
        shiftData: ShiftResolver,
      },
      ...shiftRoutesCommon,
    },
  ];
}

export function getCalculatedRoutes(userService: UserService): Routes {
  const shiftListPermission = ['can_view_my_shifts', 'can_view_shifts'].find(permission => userService.hasPermission(permission));

  return !shiftListPermission ? routes : getRoutesWithShifts(shiftListPermission);
}

@NgModule({
  exports: [RouterModule],
  providers: [
    // Box-office route root: the lazy module injector every `/box-office/**` route shares, so F&B and the
    // ticketing pages resolve one onsite-setup graph and one summary fetch per session. The availability
    // front cache lives here too, not on `PointOfSaleComponent`: a Fast load (`stale_while_revalidate`)
    // setup only pays off if the cached day survives leaving and re-entering `/box-office` (B2BS-1868).
    ...provideTicketing(
      { apiBaseUrl: environment.apiBaseUrl, gatewayBaseUrl: environment.apiGWBaseUrl },
      withOnsiteSetup(),
      withAvailabilityCache(),
    ),
    OnsiteSetupStore,
    provideIgniteTranslations(FZT_ONSITE_SETUP_TRANSLATIONS, fztOnsiteSetupTranslationsFactory),
    {
      deps: [UserService],
      provide: ROUTES,
      useFactory: getCalculatedRoutes,
    },
  ],
})
export class BoxOfficeRoutingModule {}
