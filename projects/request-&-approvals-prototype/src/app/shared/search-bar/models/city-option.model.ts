import { SelectDropdownCityOption } from '../../dropdown/select-dropdown-city-option';

export class CityOption implements SelectDropdownCityOption {
  constructor(
    public id: number,
    public title: string,
    public titleTranslated: string,
    public timezone: string,
    public currency: string | null,
    public activePlansNumber: number = 0,
    public country?: string,
  ) {}
}
