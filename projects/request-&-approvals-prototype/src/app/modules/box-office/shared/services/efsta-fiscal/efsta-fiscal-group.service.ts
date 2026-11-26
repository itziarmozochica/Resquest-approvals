import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';

import { OnsiteSetup } from '../../models/onsite-setup';
import { OnsiteSetupsStorageService } from '../onsite-setups/onsite-setups-storage.service';
import { createTableFiscalGroupResolver, readFiscalGroupsByMethodCode } from './efsta-fiscal-group.util';
import { buildComplianceLog } from './models/compliance-log.model';
import { EfstaFiscalGroupOperation, EfstaFiscalGroupResolver, FiscalGroupMapMissingError } from './models/efsta-fiscal-group.model';
import { FiscalCountryProfile } from './models/fiscal-country-profile.model';

const FISCAL_GROUP_MAP_MISSING = 'fiscal_group_map_missing';

@Injectable({
  providedIn: 'root',
})
export class EfstaFiscalGroupService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);

  /**
   * The resolver the Hungarian and Polish mappers call for one fiscal operation on `orderId`. `undefined`
   * outside those countries. Throws `FiscalGroupMapMissingError` when the stored onsite setup carries no
   * fiscal group map.
   */
  createResolver(
    fiscalCountryProfile: FiscalCountryProfile | undefined,
    operation: EfstaFiscalGroupOperation,
    orderId: number,
  ): EfstaFiscalGroupResolver | undefined {
    if (fiscalCountryProfile === undefined) {
      return undefined;
    }
    const onsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    const resolveFiscalGroup = createTableFiscalGroupResolver(onsiteSetup);
    if (resolveFiscalGroup === undefined) {
      this.#failOnMissingMap(fiscalCountryProfile, onsiteSetup, operation, orderId);
    }
    return resolveFiscalGroup;
  }

  /**
   * Throws `FiscalGroupMapMissingError`, and logs it, when `createResolver` would: a Hungarian or Polish
   * profile and no fiscal group map in the stored onsite setup. Lets a flow stop before it signs anything
   * at the EFR.
   */
  assertFiscalGroupMapAvailable(
    fiscalCountryProfile: FiscalCountryProfile | undefined,
    operation: EfstaFiscalGroupOperation,
    orderId: number,
  ): void {
    if (fiscalCountryProfile === undefined) {
      return;
    }
    const onsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    if (readFiscalGroupsByMethodCode(onsiteSetup) === undefined) {
      this.#failOnMissingMap(fiscalCountryProfile, onsiteSetup, operation, orderId);
    }
  }

  #failOnMissingMap(
    fiscalCountryProfile: FiscalCountryProfile,
    onsiteSetup: OnsiteSetup | null,
    operation: EfstaFiscalGroupOperation,
    orderId: number,
  ): never {
    this.#datadogLogService.logWarn('EFSTA fiscal group map missing', {
      ...buildComplianceLog(
        operation,
        { country: fiscalCountryProfile.countryCode, onsiteSetupId: onsiteSetup?.id },
        { errorCode: FISCAL_GROUP_MAP_MISSING, orderId },
      ),
      operation,
    });
    throw new FiscalGroupMapMissingError(`Onsite setup ${onsiteSetup?.id ?? 'none'} carries no fiscal group map`);
  }
}
