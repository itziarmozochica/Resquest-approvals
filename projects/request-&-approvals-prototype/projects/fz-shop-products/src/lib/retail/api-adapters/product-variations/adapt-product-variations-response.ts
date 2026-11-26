import type { ProductVariationsResponse } from '../../models/api/product-variations/product-variations-response.model';
import type { ProductVariationsResult } from '../../models/product-variations/product-variations.model';
import { adaptProductVariationApi } from './adapt-product-variation-api';

export function adaptProductVariationsResponse(body: ProductVariationsResponse): ProductVariationsResult {
  if (body.data === null) {
    return {
      nextPage: null,
      previousPage: null,
      productVariations: [],
      totalCount: 0,
    };
  }

  return {
    nextPage: body.data.next_page,
    previousPage: body.data.previous_page,
    productVariations: body.data.product_variations.map(adaptProductVariationApi),
    totalCount: body.data.total_count,
  };
}
