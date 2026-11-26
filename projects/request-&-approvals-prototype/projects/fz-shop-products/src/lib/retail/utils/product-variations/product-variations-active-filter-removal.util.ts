import type { ProductVariationsActiveFilterPatch } from '../../models/product-variations/product-variations-active-filter.model';
import type { ProductVariationsQuery } from '../../models/product-variations/product-variations.model';
import {
  parseProductVariationsActiveFilterId,
  PRODUCT_VARIATIONS_COLUMN_VISIBILITY_FILTER_TYPE,
  PRODUCT_VARIATIONS_SHOW_EXTERNAL_ID_COLUMN_ID,
  PRODUCT_VARIATIONS_WAREHOUSE_FILTER_TYPE,
  type ProductVariationsParsedActiveFilterId,
} from './product-variations-active-filter-id.util';

interface RemoveActiveFilterParams {
  filter: ProductVariationsParsedActiveFilterId;
  query: ProductVariationsQuery | null;
}

interface ProductVariationsActiveFilterRemover {
  type: string;
  remove: (params: RemoveActiveFilterParams) => ProductVariationsActiveFilterPatch | null;
}

interface ProductVariationsColumnVisibilityRemovalDefinition {
  id: string;
  patch: ProductVariationsActiveFilterPatch;
}

const columnVisibilityRemovalDefinitions: readonly ProductVariationsColumnVisibilityRemovalDefinition[] = [
  {
    id: PRODUCT_VARIATIONS_SHOW_EXTERNAL_ID_COLUMN_ID,
    patch: { showExternalId: false },
  },
];

const activeFilterRemovers: readonly ProductVariationsActiveFilterRemover[] = [
  {
    remove: removeWarehouseActiveFilter,
    type: PRODUCT_VARIATIONS_WAREHOUSE_FILTER_TYPE,
  },
  {
    remove: removeColumnVisibilityActiveFilter,
    type: PRODUCT_VARIATIONS_COLUMN_VISIBILITY_FILTER_TYPE,
  },
];

/**
 * Builds the store patch needed when the user clears every active Product Variations filter pill.
 *
 * This intentionally returns data only. The component decides how to apply it to the store.
 */
export function clearProductVariationsActiveFilters(): ProductVariationsActiveFilterPatch {
  return {
    query: {
      page: 1,
      warehouseIds: undefined,
    },
    showExternalId: false,
  };
}

/**
 * Resolves the store patch for one removed filter pill.
 *
 * The function parses the `type:value` pill id, finds the registered remover, and delegates the state transition to it.
 * Unknown ids return `null`, so callers can safely ignore pills they do not own.
 */
export function getProductVariationsActiveFilterRemovalPatch(params: {
  filterId: string;
  query: ProductVariationsQuery | null;
}): ProductVariationsActiveFilterPatch | null {
  const filter = parseProductVariationsActiveFilterId(params.filterId);
  const remover = activeFilterRemovers.find(item => item.type === filter.type);

  return remover?.remove({ filter, query: params.query }) ?? null;
}

function removeWarehouseActiveFilter({ filter, query }: RemoveActiveFilterParams): ProductVariationsActiveFilterPatch | null {
  if (filter.value === undefined) {
    return null;
  }

  const nextWarehouseIds = (query?.warehouseIds ?? []).filter((selectedWarehouseId: string) => selectedWarehouseId !== filter.value);

  return {
    query: {
      page: 1,
      warehouseIds: nextWarehouseIds.length > 0 ? nextWarehouseIds : undefined,
    },
  };
}

function removeColumnVisibilityActiveFilter({ filter }: RemoveActiveFilterParams): ProductVariationsActiveFilterPatch | null {
  const definition = columnVisibilityRemovalDefinitions.find(item => item.id === filter.value);

  return definition?.patch ?? null;
}
