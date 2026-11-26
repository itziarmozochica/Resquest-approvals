export interface PriceDTO {
  amount: number;
  currency: string;
}

export interface TicketsAllowedDTO {
  maximum: number;
  minimum: number;
}

export interface ProductSessionTypeDTO {
  allowed_num_tickets: TicketsAllowedDTO;
  id: number;
  label: string;
}

export interface ProductSessionSummaryDTO {
  available_tickets: number;
  end_date: string;
  gtin: string | null;
  is_hidden: boolean;
  is_searchable: boolean;
  main_plan_id?: number;
  price: PriceDTO;
  purchasable_until_date: string;
  sellable: boolean;
  session_type: ProductSessionTypeDTO;
  sku: string | null;
  start_date: string;
  surcharge_per_ticket: PriceDTO;
  tickets_allowed_per_booking: TicketsAllowedDTO;
  title: string;
}

export interface ProductSessionsDataDTO {
  next_page: number | null;
  sessions_by_id: { [sessionId: string]: ProductSessionSummaryDTO };
  sku_or_gtin_to_session_id: { [skuOrGtin: string]: number };
}
