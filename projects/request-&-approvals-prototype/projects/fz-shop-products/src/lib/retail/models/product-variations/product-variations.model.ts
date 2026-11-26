import type { WarehouseRef } from '../../../core/models/warehouse-ref.model';
import type { WarehousePrice } from '../retail-setup/warehouse.model';

export interface ProductVariationImage {
  url: string;
}
export interface ProductVariationWarehouse extends WarehouseRef {
  availableUnits: string | null;
  price: WarehousePrice;
}

export interface ProductVariation {
  createdAt: string;
  externalId: string;
  id: string;
  images: ProductVariationImage[];
  name: string;
  plansDistributionCount: number;
  productId: string;
  sku: string | null;
  warehouses: ProductVariationWarehouse[];
}

export interface ProductVariationsResult {
  nextPage: number | null;
  previousPage: number | null;
  productVariations: ProductVariation[];
  totalCount: number;
}

export interface ProductVariationsQuery {
  includeImages?: boolean;
  itemsPerPage?: number;
  page?: number;
  search?: string;
  warehouseIds?: string[];
}
