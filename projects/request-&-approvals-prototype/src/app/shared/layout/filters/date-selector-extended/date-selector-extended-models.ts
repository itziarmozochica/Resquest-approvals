import { FilterDateRange } from '../date-range/date-range.interface';

export interface DateSelectorExtendedItem {
  name: string;
  type: string;
  cb: () => FilterDateRange;
}

export interface DateSelectorExtendedState {
  name: string;
  date: FilterDateRange | null;
}
