import { inject, Injectable } from '@angular/core';

import { UserShiftStorageService } from '@fz-original/app/modules/box-office/ticketing/services/user-shift/user-shift-storage.service';
import { type CheckoutCashCaptureMode } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';

import { OSSConfigStorageService } from '../../../one-stop-shop/services/oss-config-storage.service';
import { OnsiteSetup } from '../../models/onsite-setup';
import { hasActiveCashierShift, resolveOnsiteSetupCountryCode } from '../../utils/onsite-checkout-context.util';
import { isEfstaFranceCountry } from '../efsta-fiscal/efsta-fiscal.util';
import { OnsiteSetupsStorageService } from '../onsite-setups/onsite-setups-storage.service';

export interface OnsiteCheckoutContextHost {
  activeShift: unknown;
  onsiteSetup?: OnsiteSetup | null;
}

@Injectable({
  providedIn: 'root',
})
export class OnsiteCheckoutContextResolver {
  readonly #ossConfigStorage = inject(OSSConfigStorageService);
  readonly #onsiteSetupsStorage = inject(OnsiteSetupsStorageService);
  readonly #userShiftStorage = inject(UserShiftStorageService);

  resolveCashCaptureMode(host: OnsiteCheckoutContextHost): CheckoutCashCaptureMode {
    const countryCode = resolveOnsiteSetupCountryCode({
      onsiteSetup: host.onsiteSetup,
      ossPlaceCountryCode: this.#ossConfigStorage.getConfiguration()?.onsiteSetup?.placeCountryCode,
      storedOnsiteSetup: this.#onsiteSetupsStorage.getConfiguration(),
    });
    const hasActiveShift = hasActiveCashierShift({
      activeShift: host.activeShift,
      openedShiftFromStorage: this.#userShiftStorage.getOpenedShift(),
    });
    return isEfstaFranceCountry(countryCode) && hasActiveShift ? 'mandatory' : 'optional';
  }
}
