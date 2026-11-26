import { FilterDateRange } from '@fz-original/app/shared/layout/filters/date-range/date-range.interface';

export interface ValidationSummaryFilters {
  buyerName: string | null;
  eventDateRange: FilterDateRange | null;
  purchaseDateRange: FilterDateRange | null;
}
