import type { ProductVariationApi } from './product-variation-api.model';

export interface ProductVariationsDataApi {
  next_page: number | null;
  previous_page: number | null;
  product_variations: ProductVariationApi[];
  total_count: number;
}
