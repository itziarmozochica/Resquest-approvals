import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

export interface PlanSelectOption extends SelectOption {
  planId: number;
  placeId: number;
  cityId?: number;

  image?: string;
  place?: string;
}
