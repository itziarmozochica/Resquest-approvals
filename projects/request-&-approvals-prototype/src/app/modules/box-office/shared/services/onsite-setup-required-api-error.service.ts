import { Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { responseIndicatesOnsiteSetupIdRequiredForChannel } from '@fz-original/app/shared/utils/onsite-setup-required-cart-error.util';

import { OnsiteSetupsStorageService } from './onsite-setups/onsite-setups-storage.service';

export { ONSITE_SETUP_ID_REQUIRED_ERROR_CODE } from '@fz-original/app/shared/utils/onsite-setup-required-cart-error.util';

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupRequiredApiErrorService {
  constructor(
    private readonly datadogLogService: DatadogLogService,
    private readonly onsiteSetupsStorageService: OnsiteSetupsStorageService,
  ) {}

  logMissingOnsiteSetupIdContext(source: string, extraPayload?: Record<string, unknown>): void {
    const parsedConfig = this.onsiteSetupsStorageService.getConfiguration();
    this.datadogLogService.logWarn(`[OnsiteSetup] API requires onsite_setup_id (${source})`, {
      ...extraPayload,
      parsedOnsiteSetupId: parsedConfig?.id ?? null,
      parsedOnsiteSetupName: parsedConfig?.name ?? null,
      rawOnsiteSetupConfig: localStorage.getItem(this.onsiteSetupsStorageService.ONSITE_SETUP_CONFIG),
      source,
    });
  }

  logPrepareCartResponseIfOnsiteSetupIdRequired(
    source: string,
    response: BaseResponse<unknown | null>,
    extraContext: Record<string, unknown>,
  ): void {
    if (responseIndicatesOnsiteSetupIdRequiredForChannel(response)) {
      this.logMissingOnsiteSetupIdContext(source, extraContext);
    }
  }
}
