import type { ProductVariationApi } from '../../models/api/product-variations/product-variation-api.model';
import type { ProductVariation } from '../../models/product-variations/product-variations.model';
import { adaptProductVariationWarehouseApi } from './adapt-product-variation-warehouse-api';

export function adaptProductVariationApi(productVariation: ProductVariationApi): ProductVariation {
  return {
    createdAt: productVariation.created_at,
    externalId: productVariation.external_id,
    id: productVariation.id,
    images: (productVariation.images ?? []).map(img => ({ url: img.url })),
    name: productVariation.name,
    plansDistributionCount: productVariation.plans_distribution_count,
    productId: productVariation.product_id,
    sku: productVariation.sku,
    warehouses: productVariation.warehouses.map(adaptProductVariationWarehouseApi),
  };
}
