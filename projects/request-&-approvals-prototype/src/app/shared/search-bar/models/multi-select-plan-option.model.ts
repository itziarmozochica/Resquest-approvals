import { SelectOption } from '../../layout/filters/select/select.interface';

export interface MultiSelectPlanOption extends SelectOption {
  placeName: string;
  cityId: number;
}
