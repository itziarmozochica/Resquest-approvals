import { inject, Injectable } from '@angular/core';

import { OSSConfigStorageService } from '@fz-original/app/modules/box-office/one-stop-shop/services/oss-config-storage.service';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';

import { OnsiteSetupDefaults } from '../models/onsite-setup-defaults.model';

/**
 * Reads the city, venue and last used plan of the onsite setup stored on this device, so a search
 * bar that would otherwise start empty can preselect them.
 *
 * `oss_config` wins because it is the only record holding the last plan used. Without it, the raw
 * `onsite_setup_config` gives city and venue only: it has no single plan, so the plan is left for
 * the user to choose. A setup stored for another partner is ignored.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchBarOnsiteDefaultsService {
  readonly #ossConfigStorageService = inject(OSSConfigStorageService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);

  getDefaults(partnerId: number): OnsiteSetupDefaults | null {
    return this.#getDefaultsFromOssConfig(partnerId) ?? this.#getDefaultsFromOnsiteSetup(partnerId);
  }

  #belongsToPartner(storedPartnerId: number | undefined, partnerId: number): boolean {
    return storedPartnerId === undefined || storedPartnerId === partnerId;
  }

  #getDefaultsFromOnsiteSetup(partnerId: number): OnsiteSetupDefaults | null {
    const onsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    if (!onsiteSetup || !this.#belongsToPartner(onsiteSetup.partner_id, partnerId)) {
      return null;
    }

    return {
      cityId: onsiteSetup.place?.city_id,
      venueId: onsiteSetup.place?.id ?? onsiteSetup.place_id,
    };
  }

  #getDefaultsFromOssConfig(partnerId: number): OnsiteSetupDefaults | null {
    const ossConfig = this.#ossConfigStorageService.getConfiguration();
    if (!ossConfig?.onsiteSetup || !this.#belongsToPartner(ossConfig.partnerId, partnerId)) {
      return null;
    }
    const planId = Number(ossConfig.plan?.id);

    return {
      cityId: ossConfig.onsiteSetup.cityId,
      planId: Number.isInteger(planId) && planId > 0 ? planId : undefined,
      venueId: ossConfig.onsiteSetup.placeId,
    };
  }
}
