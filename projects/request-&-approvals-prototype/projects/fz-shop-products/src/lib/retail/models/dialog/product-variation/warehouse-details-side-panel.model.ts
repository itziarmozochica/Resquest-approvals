import type { ProductVariationWarehouse } from '../../product-variations/product-variations.model';

export interface WarehouseDetailsSidePanelData {
  productVariationName: string;
  warehouses: ProductVariationWarehouse[];
}
