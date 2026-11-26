import { BookingListTicketStatus } from './booking-orders.model';

export interface BookingTicketCode {
  code: string;
  id: number;
  image: string;
  is_cancelled: boolean;
}

export interface BookingTicket {
  codes: BookingTicketCode[];
  id: number;
  session_label: string;
  session_place_name: string;
  starts_at: string;
  ticket_number: number;
  session_is_timeless?: boolean;
  status?: BookingListTicketStatus;
  target_entitlement_session_type_id?: number;
  timezone?: string;
}

export interface BookingEntitlementRescheduleInfo {
  max_reschedules: number;
  max_schedule_date: string;
  min_schedule_date: string;
  status: string;
  used_reschedules: number;
}

export interface BookingOrderDetail {
  id: number;
  plan_cover_image: string;
  plan_id: number;
  plan_name: string;
  tickets: BookingTicket[];
  catalog_main_plan_id?: number;
  catalog_main_plan_name?: string;
  entitlement_reschedule_info?: BookingEntitlementRescheduleInfo;
  place_id?: number | null;
}
