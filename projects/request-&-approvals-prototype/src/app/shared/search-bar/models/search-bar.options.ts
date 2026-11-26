import { RenameProperties } from '@fz-original/app/app/models/ts.model';
import { B2CSiteConfiguration } from '@fz-original/app/modules/resellers/models/b2c-site-configuration.model';

import { SelectDropdownCityOption } from '../../dropdown/select-dropdown-city-option';
import { PlaceOption } from './place-option.model';
import { PlanOption } from './plan-option.model';

export interface SearchBarOptions {
  cities: SelectDropdownCityOption[];
  plans: PlanOption[];
  places: PlaceOption[];
}

export type SearchBarB2CSiteMappedConfig = RenameProperties<
  B2CSiteConfiguration,
  {
    partnerId: 'id';
    partnerName: 'title';
  }
>;
