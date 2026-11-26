export interface Price {
  amount: number;
  currency: string;
}

export interface TicketsAllowed {
  maximum: number;
  minimum: number;
}

export interface SessionType {
  allowed_num_tickets: TicketsAllowed;
  id: number;
  label: string;
}

export interface ProductSession {
  id: number;
  available_tickets: number;
  end_date: string;
  is_hidden: boolean;
  is_searchable: boolean;
  main_plan_id?: number;
  price: Price;
  purchasable_until_date: string;
  sellable: boolean;
  session_type: SessionType;
  start_date: string;
  surcharge_per_ticket: Price;
  tickets_allowed_per_booking: TicketsAllowed;
  title: string;
  gtin: string | null;
  sku: string | null;
}

export interface ProductSessionsSummaryData {
  next_page: number | null;
  sessions_by_id: { [sessionId: string]: ProductSession };
  sku_or_gtin_to_session_id: { [skuOrGtin: string]: number };
}

export interface ProductSessionsSummary extends ProductSessionsSummaryData {
  title_to_session_id: { [title: string]: number };
}

export interface ProductSessionsSummaryQuery {
  partnerId: number;
  onsiteSetupId: string;
  channel: string;
}

export interface CachedProductSessionsQuery {
  partnerId: number;
  onsiteSetupId: string;
  channel: string;
}

export interface CachedProductSessionsSummary {
  data: ProductSessionsSummary;
  timestamp: number;
  query: CachedProductSessionsQuery;
}
