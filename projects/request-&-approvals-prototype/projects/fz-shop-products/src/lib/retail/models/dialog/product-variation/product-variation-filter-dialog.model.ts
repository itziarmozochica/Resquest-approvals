import type { WarehouseRef } from '../../../../core/models/warehouse-ref.model';
import type { ProductVariationsFilterFormValue } from '../../form/product-variation/product-variations-filter-form.model';

export interface ProductVariationsFilterResult {
  selection: ProductVariationsFilterFormValue;
}

export interface ProductVariationsFilterPanelData {
  selection: ProductVariationsFilterFormValue;
  warehouses: WarehouseRef[];
}
