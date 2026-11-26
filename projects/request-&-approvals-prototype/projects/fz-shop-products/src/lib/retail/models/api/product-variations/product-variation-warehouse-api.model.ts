export interface WarehousePriceApi {
  amount: string;
  currency: string;
}
export interface ProductVariationWarehouseApi {
  available_units: string | null;
  id: string;
  name: string;
  price: WarehousePriceApi;
}
