import type { ProductVariationImageApi } from './product-variation-image-api.model';
import type { ProductVariationWarehouseApi } from './product-variation-warehouse-api.model';

export interface ProductVariationApi {
  created_at: string;
  external_id: string;
  id: string;
  name: string;
  plans_distribution_count: number;
  product_id: string;
  sku: string | null;
  warehouses: ProductVariationWarehouseApi[];
  images?: ProductVariationImageApi[];
}
