import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';

export interface SelectPlaceOption extends SelectOption {
  cityId: number;
}

export interface ThreeSixtyQueryParams {
  cityIds: string;
  placeIds: string;
  planIds: string;
  statuses: string;
  currency?: string;
}

export interface ThreeSixtySelection {
  cityIds: number[];
  placeIds: number[];
  planIds: number[];
  statuses: PlanStatus[];
  currency?: string;
}
