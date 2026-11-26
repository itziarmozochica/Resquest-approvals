export interface PlanDateAvailability {
  status: string;
  has_any_discount?: boolean;
  is_best_price?: boolean;
  min_ticket_price?: number;
}

export interface PlanAvailabilityResponse {
  dates: Record<string, PlanDateAvailability>;
}

export interface PlanDetailPlace {
  id: number;
  name: string;
}

export interface PlanDetailResponse {
  places: PlanDetailPlace[];
}

export interface TicketLevel {
  items: LevelTicketItem[];
  type: string;
  session_selector_group_hash?: string;
}

export interface LevelTicketItem {
  default_label: string;
  level: TicketLevel | null;
  value: unknown;
}

export interface SessionAddOnAllowedRange {
  max?: number;
  min?: number;
  step?: number;
}

export interface SessionAddOnViewConfiguration {
  allowed_range?: SessionAddOnAllowedRange;
  type?: string;
}

export interface SessionAddOn {
  cart_item_id: number;
  item_type: number | string;
  label: string;
  category?: string;
  purchasable_state?: string;
  session_selector_group_hash?: string;
  view_configuration?: SessionAddOnViewConfiguration;
}

export interface SessionsForDateResponse {
  level: TicketLevel;
  add_ons?: Record<string, SessionAddOn[]>;
}

export interface RescheduleSession {
  id: number;
  label: string;
  availableTickets?: number;
  itemType?: string;
}

export interface RescheduleTimeSlot {
  bookable: boolean;
  time: string;
}
