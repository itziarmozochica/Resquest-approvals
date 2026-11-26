export interface MoneyApi {
  amount: number;
  currency: string;
}

export interface CartSessionAdjustmentPriceApi {
  total_price_with_override: MoneyApi;
  total_price_without_override: MoneyApi;
  total_surcharge_with_override: MoneyApi;
  total_surcharge_without_override: MoneyApi;
}

export interface CartSessionTypeApi {
  id: number;
  is_entry_pass?: boolean;
  is_shop_product?: boolean;
  label?: string;
  ticket_receipt_label?: string | null;
}

export interface CartSessionApi {
  id: number;
  units: number;
  bundle_discount?: MoneyApi;
  is_add_on?: boolean;
  is_pack?: boolean;
  is_shop_product?: boolean;
  main_plan_id?: number;
  override_prices?: CartSessionAdjustmentPriceApi | null;
  place_id?: number;
  price?: MoneyApi;
  seat_references?: string[];
  seats?: string[];
  session_type?: CartSessionTypeApi;
  session_type_id?: number;
  source_session_type_id?: number | null;
  start_date?: string;
  surcharge_per_ticket?: MoneyApi;
  timezone?: string;
  title?: string;
  title_without_format?: string;
  total_strikethrough_price?: MoneyApi | null;
  total_surcharge_per_ticket?: MoneyApi;
  unit_price?: MoneyApi;
  user_confirmation_messages?: string[] | null;
}

export interface CartTaxItemApi {
  tax_amount: MoneyApi;
  tax_name: string;
}

export interface CartAdjustmentRoundingApi {
  amount: MoneyApi;
}

export interface CartAdjustmentPriceApi {
  amount: number;
  calculation: string;
  concept: string;
  coupon_code?: string;
  id?: string;
  operation?: string;
  rounded?: CartAdjustmentRoundingApi;
  total?: MoneyApi;
}

export interface CartSessionItemLineApi {
  main_plan_id: number | null;
  parent: string | null;
  session_id: number;
  id?: string;
}

export interface CartApi {
  session_items: CartSessionApi[];
  adjustment?: CartAdjustmentPriceApi | null;
  confirmed_at?: string | null;
  created_at?: string | null;
  id?: string;
  is_flexible_bundle?: boolean;
  number_of_tickets?: number;
  prepared_at?: string | null;
  session_item_lines?: CartSessionItemLineApi[];
  tax_items?: CartTaxItemApi[];
  timezone?: string;
  total?: MoneyApi;
  total_bundle_discount?: MoneyApi;
  total_surcharge?: MoneyApi;
  total_surcharge_per_ticket?: MoneyApi;
  total_tax_base?: MoneyApi;
  total_tickets_without_discounts?: MoneyApi;
  total_without_discount?: MoneyApi;
  total_without_override?: MoneyApi;
  user_confirmation_messages?: string[] | null;
}
