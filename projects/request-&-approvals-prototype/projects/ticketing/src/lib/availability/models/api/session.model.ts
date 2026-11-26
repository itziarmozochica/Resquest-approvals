export interface MoneyApi {
  amount: number;
  currency: string;
}

export interface StrikethroughPriceApi {
  amount: number | null;
  currency: string;
}

export interface SessionB2bPricingApi {
  discount_percentage: number | string;
  wholesale_price: MoneyApi;
}

export interface TicketsAllowedApi {
  maximum: number;
  minimum: number;
}

export interface SeatingApi {
  category: string;
  pool_id?: number | null;
  seats?: string[];
}

export type ReservationRestrictionApi = 'none' | 'not_allowed';

export interface SessionTypeTagApi {
  id: number;
  tag: string;
}

export interface SessionTypeAddOnConfigurationApi {
  category?: string;
  pricing_type: string;
  selector_type?: string;
}

export interface SessionTypeApi {
  id: number;
  add_on_configuration?: SessionTypeAddOnConfigurationApi;
  allowed_num_tickets?: TicketsAllowedApi;
  color?: string | null;
  ignore_time_slot_capacity?: boolean;
  image_url?: string;
  is_add_on?: boolean;
  is_pass?: boolean;
  is_shop_product?: boolean;
  is_timeless?: boolean;
  label?: string;
  reservation_restriction?: ReservationRestrictionApi;
  sorting?: number;
  tags?: SessionTypeTagApi[] | null;
  ticket_receipt_label?: string;
  ticket_selector_step_quantity?: number | null;
}

export interface BookingQuestionApi {
  id: string;
  label: string;
  message: string;
  type: string;
  choices?: Record<string, string>[];
}

export interface SharedAvailabilityRuleItemTypeApi {
  max: number;
  min: number;
  type: string;
  message_on_failure?: string | null;
  message_on_failure_min?: string | null;
  quantity_multiplier?: number;
}

export interface SharedAvailabilityRuleApi {
  item_types_sharing_availability_all_of: SharedAvailabilityRuleItemTypeApi[];
}

export interface SharedAvailabilityBudgetApi {
  max: number;
  message_on_failure?: string | null;
}

export interface SessionApi {
  available_tickets: number;
  end_date: string;
  id: number;
  /** Optional in practice: sessions have been observed on the wire without it (see `adaptSessionApi`). */
  name?: string;
  price: MoneyApi;
  purchasable_from_date: string | null;
  purchasable_until_date: string | null;
  sellable: boolean;
  start_date: string;
  tickets_allowed_per_booking: TicketsAllowedApi;
  title: string;
  booking_questions?: BookingQuestionApi[];
  details?: string;
  is_hidden?: boolean;
  is_pack?: boolean;
  main_plan_id?: number;
  override_available_tickets?: number | null;
  place_id?: number;
  b2b?: SessionB2bPricingApi | null;
  seating?: SeatingApi | null;
  session_type?: SessionTypeApi;
  shared_availability_footprint?: string[] | null;
  shared_availability_rule?: SharedAvailabilityRuleApi | null;
  strikethrough_price?: StrikethroughPriceApi | null;
  surcharge_per_ticket?: MoneyApi;
  tickets_allowed_per_booking_excluding_availability?: TicketsAllowedApi;
}
