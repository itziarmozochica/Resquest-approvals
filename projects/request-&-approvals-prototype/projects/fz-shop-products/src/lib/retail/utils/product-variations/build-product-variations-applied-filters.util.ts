import type { IgntTableAppliedFilter } from '@ignite/table';

import type { ProductVariationsAppliedFiltersSource } from '../../models/product-variations/product-variations-active-filter.model';
import {
  buildProductVariationsActiveFilterId,
  PRODUCT_VARIATIONS_COLUMN_VISIBILITY_FILTER_TYPE,
  PRODUCT_VARIATIONS_WAREHOUSE_FILTER_TYPE,
} from './product-variations-active-filter-id.util';

interface ProductVariationsAppliedFilterBuilder {
  build: (source: ProductVariationsAppliedFiltersSource) => readonly IgntTableAppliedFilter[];
}

const activeFilterBuilders: readonly ProductVariationsAppliedFilterBuilder[] = [
  {
    build: buildWarehouseActiveFilters,
  },
  {
    build: buildColumnVisibilityActiveFilters,
  },
];

/**
 * Converts Product Variations filter state into Ignite table active filter pills.
 *
 * New filter groups should add another builder to `activeFilterBuilders`, keeping the component free from filter-specific branches.
 */
export function buildProductVariationsAppliedFilters(source: ProductVariationsAppliedFiltersSource): readonly IgntTableAppliedFilter[] {
  return activeFilterBuilders.flatMap(definition => definition.build(source));
}

function buildWarehouseActiveFilters({ warehouse }: ProductVariationsAppliedFiltersSource): readonly IgntTableAppliedFilter[] {
  return warehouse.selectedIds.map((warehouseId: string): IgntTableAppliedFilter => {
    const selectedWarehouse = warehouse.options.find(item => item.id === warehouseId);

    return {
      id: buildProductVariationsActiveFilterId(PRODUCT_VARIATIONS_WAREHOUSE_FILTER_TYPE, warehouseId),
      label: selectedWarehouse?.name ?? warehouseId,
    };
  });
}

function buildColumnVisibilityActiveFilters({
  columnVisibility,
}: ProductVariationsAppliedFiltersSource): readonly IgntTableAppliedFilter[] {
  return columnVisibility
    .filter(source => source.isSelected)
    .map(
      (source): IgntTableAppliedFilter => ({
        id: buildProductVariationsActiveFilterId(PRODUCT_VARIATIONS_COLUMN_VISIBILITY_FILTER_TYPE, source.id),
        label: source.label,
      }),
    );
}
