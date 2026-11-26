import { Params } from '@angular/router';

import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { EDIT_ONSITE_SETUP_QUERY_PARAM } from '@fz-original/app/modules/box-office/shared/utils/edit-onsite-setup-param.util';

export const ONSITE_SETUP_SETTINGS_ROUTE: readonly string[] = ['/box-office/settings'];
export const ONSITE_SETUP_SETTINGS_TAB = 'onsite-setup';

/** Query params that open the settings page on the setup's venue with its edit form already open. */
export function toOnsiteSetupSettingsQueryParams(setup: OnsiteSetup): Params {
  return {
    cityId: setup.place?.city_id,
    [EDIT_ONSITE_SETUP_QUERY_PARAM]: setup.id,
    tab: ONSITE_SETUP_SETTINGS_TAB,
    venueId: setup.place_id ?? setup.place?.id,
  };
}
