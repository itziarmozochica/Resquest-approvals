import { SelectDropdownCityOption } from '../../dropdown/select-dropdown-city-option';
import { FilterDateRange } from '../../layout/filters/date-range/date-range.interface';
import { SelectOption } from '../../layout/filters/select/select.interface';
import { Partner } from '../../models/partner/partner.model';

export class SearchFilter {
  constructor(
    public partner: Partner | null,
    public selectedCity: SelectDropdownCityOption | undefined,
    public selectedPlan: SelectOption | undefined,
    public selectedPlace: SelectOption | undefined,
    public selectedDateRange: FilterDateRange | null,
    public timezone: string,
    public isDefaultFilter: boolean,
    public typedCity?: string,
    public typedPlan?: string,
    public typedPlace?: string,
    public selectedChannel?: SelectOption,
    public typedChannel?: string,
    public hasSeatingPlans?: boolean,
    public selectedPlanKind?: SelectOption | null,
    public selectedPlanStatus?: SelectOption | null,
  ) {}
}
