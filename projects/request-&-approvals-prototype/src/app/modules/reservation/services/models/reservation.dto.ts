import { BusinessTypeEnum } from '../../../../modules/settings/shared/models/business-type.enum';
import { DepositData } from '../../../../shared/models/deposit/deposit.model';
import { JourneyDTO } from '../../../../shared/models/journey/journey.dto';
import { ReservationAttendanceEnum } from '../../models/reservation-attendance.enum';
import { ReservationNoteData } from '../../models/reservation-note.model';
import { ReservationStatus } from '../../models/reservation-status.enum';

export interface ReservationSessionItemTicketsAllowedDTO {
  maximum: number;
  minimum: number;
}

export interface ReservationPlanSummaryDTO {
  available_languages: string[];
  default_language: string | null;
  has_booking_questions: boolean;
  id: number;
  name: string;
}

export interface ReservationSessionItemBreakdownDTO {
  session_id: number;
  session_label: string;
  count: number;
  is_add_on: boolean;
  serving_at?: string | null;
  tickets_allowed_per_booking?: ReservationSessionItemTicketsAllowedDTO;
  tickets_allowed_per_booking_excluding_availability?: ReservationSessionItemTicketsAllowedDTO;
  available_tickets?: number;
  ticket_selector_step_quantity?: number;
}

export interface UserReservationDTO {
  email: string;
  first_name: string;
  fullname: string;
  id: number;
  last_name: string;
  is_name_editable?: boolean;
  terms?: Array<string>;
}

export interface ReservationDTO {
  partner_id?: number;
  distributor_id?: number | null;
  id: string;
  locator: string;
  status: ReservationStatus;
  b2b_user_name: string;
  b2b_user_email: string;
  b2b_user_username: string;
  b2b_business_id: string | null;
  b2b_business_name: string | null;
  b2b_business_type: BusinessTypeEnum | null;
  b2b_business_email: string | null;
  b2b_business_phone: string | null;
  total_to_be_paid: number;
  currency: string;
  total_number_of_tickets: number;
  session_starts_at: string;
  created_at: string;
  place_id: number;
  place_name: string;
  plan_name: string;
  plan_default_language: string;
  plan_available_languages: string[];
  plan_has_booking_questions?: boolean;
  plan_session_selector_type?: string;
  plan_id: number;
  plans?: ReservationPlanSummaryDTO[];
  cart_id: string;
  city_id: number;
  city_name: string;
  order_id: string;
  expiration_date_time: string;
  attendance: ReservationAttendanceEnum;
  user: UserReservationDTO;
  channel_id: string;
  reservation_note?: ReservationNoteData;
  deposit?: DepositData;
  external_locator_id?: string | null;
  has_asset_based_booking?: boolean;
  journey?: JourneyDTO;
  session_items_breakdown?: ReservationSessionItemBreakdownDTO[] | null;
  purchase_urn?: string | null;
}
