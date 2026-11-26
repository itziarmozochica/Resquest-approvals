export type BookingListTicketStatus = 'active' | 'cancelled' | 'transferred';

export interface BookingListTicket {
  id: number;
  session_is_timeless?: boolean;
  session_label?: string;
  session_place_name?: string;
  starts_at?: string;
  status?: BookingListTicketStatus;
  ticket_number?: number;
  timezone?: string;
}

export interface BookingOrderEntitlementsInfo {
  status: string;
  used_reschedules: number;
  max_reschedule_date?: string | null;
  max_reschedules?: number | null;
}

export interface BookingOrderSummary {
  id: number;
  is_timeless?: boolean;
  place_name: string;
  plan_cover_image: string;
  plan_name: string;
  purchased_at: string;
  tickets: BookingListTicket[];
  entitlements_info?: BookingOrderEntitlementsInfo | null;
  external_id?: string;
}

export interface BookingOrderGroup {
  order_group_id: string;
  orders: BookingOrderSummary[];
  main_group_order?: { id: number } | null;
}

export interface BookingOrdersResponse {
  data: BookingOrderGroup[];
  next: string | null;
  previous: string | null;
}

export type BookingOrdersStatus = 'finished' | 'upcoming';
