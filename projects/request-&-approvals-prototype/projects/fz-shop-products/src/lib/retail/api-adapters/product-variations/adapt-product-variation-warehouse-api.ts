import type { ProductVariationWarehouseApi } from '../../models/api/product-variations/product-variation-warehouse-api.model';
import type { ProductVariationWarehouse } from '../../models/product-variations/product-variations.model';

export function adaptProductVariationWarehouseApi(dto: ProductVariationWarehouseApi): ProductVariationWarehouse {
  return {
    availableUnits: dto.available_units,
    id: dto.id,
    name: dto.name,
    price: dto.price,
  };
}
