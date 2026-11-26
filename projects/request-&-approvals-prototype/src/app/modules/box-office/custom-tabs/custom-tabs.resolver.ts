import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import type { RetailSetup } from '@fz-shop-products/src/lib/retail/models/retail-setup/retail-setup.model';
import type { Warehouse } from '@fz-shop-products/src/lib/retail/models/retail-setup/warehouse.model';
import { FzRetailSetupService } from '@fz-shop-products/src/lib/retail/services/retail-setup.service';
import { catchError, finalize, forkJoin, map, Observable, of } from 'rxjs';

import { OnsiteSetupsService } from '../shared/services/onsite-setups/onsite-setups.service';
import { CustomTabsResponse } from './services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';
import { OnsiteSetupCustomTabsService } from './services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.service';

export interface CustomTabsResolverData {
  customTabs: CustomTabsResponse | null;
  partnerId: number | null;
  retailSetupId: string | null;
  warehouse: Warehouse | null;
}

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupCustomTabsResolver {
  #customTabsService = inject(OnsiteSetupCustomTabsService);
  #onsiteSetupsService = inject(OnsiteSetupsService);
  #partnerService = inject(PartnerService);
  #fzRetailSetupService = inject(FzRetailSetupService);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);

  resolve(route: ActivatedRouteSnapshot): Observable<CustomTabsResolverData | null> {
    const onsiteSetupId = route.paramMap.get('onsiteSetupId');

    if (onsiteSetupId === null) {
      this.#router.navigate(['/box-office/settings']);
      return of(null);
    }

    const partner = this.#partnerService.getPartner();
    if (partner === null) {
      return of(null);
    }

    this.#spinnerService.show();

    return forkJoin({
      customTabs: this.#customTabsService.getCustomTabs({
        onsiteSetupId,
        partnerId: partner.id,
      }),
      onsiteSetup: this.#onsiteSetupsService.getOnsiteSetup(onsiteSetupId).pipe(catchError(() => of(null))),
      retailSetups: this.#fzRetailSetupService.getRetailSetups().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ customTabs, onsiteSetup, retailSetups }) => ({
        customTabs: customTabs.data,
        retailSetupId: onsiteSetup?.retail_setup_id ?? null,
        warehouse: this.#findWarehouse(retailSetups, onsiteSetup?.warehouse_id ?? null),
        partnerId: partner.id,
      })),
      catchError(() => of(null)),
      finalize(() => this.#spinnerService.hide()),
    );
  }

  #findWarehouse(retailSetups: RetailSetup[] | null, warehouseId: string | null): Warehouse | null {
    if (!warehouseId || !retailSetups?.length) {
      return null;
    }

    for (const setup of retailSetups) {
      const warehouse = setup.warehouses.find(w => w.id === warehouseId);
      if (warehouse) {
        return warehouse;
      }
    }

    return null;
  }
}
