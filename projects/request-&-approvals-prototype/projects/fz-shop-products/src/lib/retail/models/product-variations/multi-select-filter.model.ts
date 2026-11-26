import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

import type { ProductVariationsFilterFormValue } from '../form/product-variation/product-variations-filter-form.model';

export type MultiSelectFilterControl = keyof Omit<ProductVariationsFilterFormValue, 'showExternalId'>;

export interface ProductVariationsMultiSelectFilterField {
  filterName: MultiSelectFilterControl;
  label: string;
  options: SelectOption[];
  searchPlaceholder: string;
  selected: SelectOption[];
  testId: string;
}
