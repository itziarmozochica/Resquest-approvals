const FILTER_ID_SEPARATOR = ':';

export const PRODUCT_VARIATIONS_COLUMN_VISIBILITY_FILTER_TYPE = 'columnVisibility';
export const PRODUCT_VARIATIONS_SHOW_EXTERNAL_ID_COLUMN_ID = 'showExternalId';
export const PRODUCT_VARIATIONS_WAREHOUSE_FILTER_TYPE = 'warehouse';

export interface ProductVariationsParsedActiveFilterId {
  type: string;
  value?: string;
}

/**
 * Builds a stable pill id using the `type:value` convention shared by Product Variations active filters.
 */
export function buildProductVariationsActiveFilterId(type: string, value: string): string {
  return `${type}${FILTER_ID_SEPARATOR}${value}`;
}

/**
 * Splits a Product Variations active filter pill id back into its routing parts.
 */
export function parseProductVariationsActiveFilterId(filterId: string): ProductVariationsParsedActiveFilterId {
  const [type, ...valueParts] = filterId.split(FILTER_ID_SEPARATOR);

  return {
    type,
    value: valueParts.length > 0 ? valueParts.join(FILTER_ID_SEPARATOR) : undefined,
  };
}
