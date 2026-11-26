export interface SessionTypeCatalogItemDto {
  id: number;
  label: string;
  base_price: string | null;
  is_add_on: boolean;
  is_shop_product: boolean;
}

export interface SessionTypeCatalogItem {
  id: number;
  label: string;
  basePrice: number | null;
  isAddOn: boolean;
  isShopProduct: boolean;
}

export interface GetSessionTypesCatalogResponseDto {
  data: {
    session_types: SessionTypeCatalogItemDto[];
  };
  error: unknown;
}
