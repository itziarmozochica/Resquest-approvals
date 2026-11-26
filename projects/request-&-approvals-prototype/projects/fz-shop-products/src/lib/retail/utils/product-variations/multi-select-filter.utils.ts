import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

import type { ProductVariationsFilterPanelData } from '../../models/dialog/product-variation/product-variation-filter-dialog.model';

export function warehousesToOptions(warehouses: ProductVariationsFilterPanelData['warehouses']): SelectOption[] {
  return warehouses.map(warehouse => ({
    id: warehouse.id,
    title: warehouse.name,
  }));
}

export function selectedOptionsFromIds(options: SelectOption[], selectedIds: string[]): SelectOption[] {
  const idSet = new Set(selectedIds);
  return options.filter(option => idSet.has(String(option.id)));
}
