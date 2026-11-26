import { inject, Injectable } from '@angular/core';

import { PartnerService } from '../../services/partner/partner.service';

@Injectable({
  providedIn: 'root',
})
export class CreateEventVisibilityService {
  readonly #partnerService = inject(PartnerService);

  isAvailable(isOneStopShopModeEnabled: boolean): boolean {
    return Boolean(this.#partnerService.getPartner()) && !isOneStopShopModeEnabled;
  }
}
