import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import { toStableJson } from '@fz-original/app/app/utils/ts/ts.util';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { toStoredOnsiteSetup } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';

export function hasOnsiteSetupChanged(activeOnsiteSetup: OnsiteSetup, latestOnsiteSetup: OnsiteSetup): boolean {
  return toComparableJson(activeOnsiteSetup) !== toComparableJson(latestOnsiteSetup);
}

export function isCompleteOnsiteSetup(onsiteSetup: Partial<OnsiteSetup>): onsiteSetup is OnsiteSetup {
  return (
    Array.isArray(onsiteSetup.payment_methods) &&
    Array.isArray(onsiteSetup.cash_registers) &&
    Array.isArray(onsiteSetup.preset_coupon_codes)
  );
}

export function isOnsiteSetupRemoved(error: BaseErrorResponse): boolean {
  return error.error instanceof HttpErrorResponse && error.error.status === HttpStatusCode.NotFound;
}

/**
 * The embedded second screen configuration compares by id only: `PosSetupService` refreshes its content live (B2BO-9598), so an
 * edit to the configuration never asks for a reload, while assigning another configuration still does.
 */
function toComparableJson(onsiteSetup: OnsiteSetup): string {
  return toStableJson({
    ...toStoredOnsiteSetup(onsiteSetup),
    second_screen_configuration: onsiteSetup.second_screen_configuration?.id ?? null,
    user_id: undefined,
  });
}
