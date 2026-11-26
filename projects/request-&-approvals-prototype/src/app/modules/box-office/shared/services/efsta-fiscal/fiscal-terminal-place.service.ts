import { inject, Injectable } from '@angular/core';

import { OSSConfigStorageService } from '../../../one-stop-shop/services/oss-config-storage.service';
import { FiscalCountryProfile } from './models/fiscal-country-profile.model';

@Injectable({
  providedIn: 'root',
})
export class FiscalTerminalPlaceService {
  readonly #ossConfigStorageService = inject(OSSConfigStorageService);

  resolveFiscalTerminalPlaceId(
    fiscalCountryProfile: FiscalCountryProfile | undefined,
    callerPlaceId: number | undefined,
  ): number | undefined {
    if (fiscalCountryProfile?.mapper !== 'poland') {
      return callerPlaceId;
    }
    const onsiteSetup = this.#ossConfigStorageService.getConfiguration()?.onsiteSetup;
    return onsiteSetup?.placeId ?? callerPlaceId;
  }
}
