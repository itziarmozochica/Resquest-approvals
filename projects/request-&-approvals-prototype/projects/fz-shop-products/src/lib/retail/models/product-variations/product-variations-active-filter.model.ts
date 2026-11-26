import type { WarehouseRef } from '../../../core/models/warehouse-ref.model';
import type { ProductVariationsQuery } from './product-variations.model';

/**
 * Selected warehouse filters needed to render active filter pills.
 */
export interface ProductVariationsWarehouseActiveFilterSource {
  options: readonly WarehouseRef[];
  selectedIds: readonly string[];
}

/**
 * Boolean-like filter source rendered as an active filter pill when selected.
 */
export interface ProductVariationsSelectableActiveFilterSource {
  id: string;
  isSelected: boolean;
  label: string;
}

/**
 * Filter groups used to build the Product Variations active filter pills.
 */
export interface ProductVariationsAppliedFiltersSource {
  columnVisibility: readonly ProductVariationsSelectableActiveFilterSource[];
  warehouse: ProductVariationsWarehouseActiveFilterSource;
}

/**
 * Store patch emitted by active filter actions.
 *
 * The component applies this patch to the existing store APIs, keeping the utility framework-agnostic.
 */
export interface ProductVariationsActiveFilterPatch {
  query?: Pick<ProductVariationsQuery, 'page' | 'warehouseIds'>;
  showExternalId?: boolean;
}
