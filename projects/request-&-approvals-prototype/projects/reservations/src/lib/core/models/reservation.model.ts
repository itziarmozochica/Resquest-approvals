import type { BusinessType } from './business-type.model';
import type { Deposit, DepositApi } from './deposit.model';
import type { Money } from './money.model';
import type { ReservationNote, ReservationNoteApi } from './reservation-note.model';
import type { ReservationPlanSummary, ReservationPlanSummaryApi } from './reservation-plan-summary.model';
import type {
  ReservationSessionItem,
  ReservationSessionItemBreakdownApi,
  ReservationSessionItemTicketsAllowed,
} from './reservation-session-item-tickets-allowed.model';

export type ReservationStatus = 'cancelled' | 'expired' | 'paid' | 'to_be_paid';

export type ReservationAttendance = 'arrived' | 'validated';

export interface ReservationUserApi {
  email: string;
  first_name: string;
  fullname: string;
  id: number;
  last_name: string;
  is_name_editable?: boolean;
  terms?: string[];
}

export interface ReservationEndCustomerApi {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface ReservationApi {
  attendance: ReservationAttendance;
  b2b_business_email: string;
  b2b_business_id: string;
  b2b_business_name: string;
  b2b_business_phone: string;
  b2b_business_type: BusinessType;
  b2b_user_email: string;
  b2b_user_name: string;
  b2b_user_username: string;
  cart_id: string;
  channel_id: string;
  city_id: number;
  city_name: string;
  created_at: string;
  currency: string;
  expiration_date_time: string;
  id: string;
  locator: string;
  order_id: number | null;
  place_id: number;
  place_name: string;
  plan_available_languages: string[];
  plan_default_language: string;
  plan_id: number;
  plan_name: string;
  session_starts_at: string;
  status: ReservationStatus;
  total_number_of_tickets: number;
  total_to_be_paid: number;
  deposit?: DepositApi;
  end_customer?: ReservationEndCustomerApi | null;
  external_locator_id?: string | null;
  hide_price_on_tickets?: boolean;
  partner_id?: number;
  payment_link_sent_at?: string | null;
  payment_link_sent_to?: string | null;
  plan_has_booking_questions?: boolean;
  plans?: ReservationPlanSummaryApi[];
  purchase_urn?: string | null;
  reservation_note?: ReservationNoteApi | null;
  session_items_breakdown?: ReservationSessionItemBreakdownApi[] | null;
  user?: ReservationUserApi;
}

export interface Reservation {
  readonly attendanceStatus: ReservationAttendance | undefined;
  readonly b2bUserEmail: string;
  readonly b2bUserName: string;
  readonly b2bUserUsername: string;
  readonly businessEmail: string;
  readonly businessId: string;
  readonly businessName: string;
  readonly businessPhone: string;
  readonly businessType: BusinessType;
  readonly cartId: string;
  readonly channelId: string;
  readonly cityId: number;
  readonly cityName: string;
  readonly createdAt: string;
  readonly endCustomerEmail: string | undefined;
  readonly endCustomerFirstName: string | undefined;
  readonly endCustomerLastName: string | undefined;
  readonly expirationDate: string | undefined;
  readonly externalReservationId: string | null;
  readonly hidePriceOnTickets: boolean;
  readonly id: string;
  readonly locator: string | null;
  readonly orderId: string | null;
  readonly ownerEmail: string | undefined;
  readonly ownerFirstName: string | undefined;
  readonly ownerFullName: string | undefined;
  readonly ownerLastName: string | undefined;
  readonly ownerNameEditable: boolean | undefined;
  readonly partnerId: number | null;
  readonly paymentLinkSentAt: string | null;
  readonly paymentLinkSentTo: string | null;
  readonly placeId: number;
  readonly placeName: string;
  readonly planAvailableLanguages: readonly string[];
  readonly planDefaultLanguage: string;
  readonly planHasBookingQuestions: boolean;
  readonly planId: number;
  readonly planName: string;
  readonly plans: readonly ReservationPlanSummary[];
  readonly purchaseUrn: string | null;
  readonly sessionItems: readonly ReservationSessionItem[];
  readonly sessionStartsAt: string;
  readonly status: ReservationStatus;
  readonly totalNumberOfTickets: number;
  readonly totalToBePaid: Money;
  readonly deposit?: Deposit;
  readonly note?: ReservationNote;
  readonly ticketsAllowedPerBookingBySessionId?: ReadonlyMap<number, ReservationSessionItemTicketsAllowed>;
}
