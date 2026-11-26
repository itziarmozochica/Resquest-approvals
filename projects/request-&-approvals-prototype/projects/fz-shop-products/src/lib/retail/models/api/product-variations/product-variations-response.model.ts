import type { ProductVariationsDataApi } from './product-variations-data-api.model';

export interface ProductVariationsResponse {
  data: ProductVariationsDataApi | null;
  error?: unknown;
}
