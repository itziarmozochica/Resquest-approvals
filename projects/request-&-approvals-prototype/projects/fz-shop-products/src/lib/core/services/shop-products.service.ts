import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { environment } from '@fz-original/environments/environment';
import { assertIsDefined } from '@fz/utils/assert-is-defined';

@Injectable({
  providedIn: 'root',
})
export class FzShopProductsService {
  readonly #partnerService = inject(PartnerService);
  readonly #partnersBaseUrl = `${environment.apiGWBaseUrl}/1.0/partners`;
  readonly #fever2BaseUrl = `${environment.apiBaseUrl}/partners`;
  readonly #partner = toSignal(this.#partnerService.partner$(), {
    initialValue: this.#partnerService.getPartner(),
  });

  readonly partnerId = computed(() => {
    const id = this.#partner()?.id;
    assertIsDefined(id);
    return id;
  });

  retailSetupAccountsUrl(): string {
    return `${this.retailSetupsUrl()}/accounts`;
  }

  retailSetupsUrl(): string {
    return `${this.#partnersBaseUrl}/${this.partnerId()}/retail-setups`;
  }

  salesRoutingUrl(retailSetupId: string): string {
    return `${this.retailSetupsUrl()}/${retailSetupId}/sales-routing`;
  }

  syncShopProductsUrl(retailSetupId: string): string {
    return `${this.#fever2BaseUrl}/${this.partnerId()}/retail-setups/${retailSetupId}/sync-shop-products/`;
  }
}
