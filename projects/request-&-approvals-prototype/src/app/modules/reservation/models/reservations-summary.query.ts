import { BusinessTypeEnum } from '../../settings/shared/models/business-type.enum';
import { ReservationsListAudience } from '../enums/reservations-list-audience.enum';
import { ReservationStatus } from './reservation-status.enum';

export interface ReservationsSummaryQuery {
  audience?: ReservationsListAudience;
  businessTypes?: BusinessTypeEnum[];
  cityId?: number;
  includeBookingAnswers?: boolean;
  includeCount?: boolean;
  includeStaffNotes?: boolean;
  itemsPerPage?: number;
  orderBy?: string;
  orderId?: string;
  page?: number;
  partnerId?: number;
  placeId?: number;
  planId?: number;
  reservationLocator?: string;
  search?: string;
  startsAtFrom?: Date;
  startsAtTo?: Date;
  status?: ReservationStatus[];
  timezone?: string;
}

export interface ReservationsSummaryQueryDTO {
  business_types?: BusinessTypeEnum[];
  city_id?: number;
  include_booking_answers?: boolean;
  include_count?: boolean;
  include_staff_notes?: boolean;
  items_per_page?: number;
  order_by?: string;
  order_id?: string;
  page?: number;
  partner_id?: number;
  place_id?: number;
  plan_id?: number;
  reservation_locator?: string;
  reservation_status?: ReservationStatus[];
  search_term?: string;
  starts_at_from?: string;
  starts_at_to?: string;
  timezone?: string;
}
