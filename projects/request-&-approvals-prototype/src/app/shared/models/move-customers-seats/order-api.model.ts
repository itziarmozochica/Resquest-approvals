/**
 * API Response models for the seating-info endpoint.
 * These interfaces match the API response structure with snake_case naming.
 */

import { BaseErrorResponse } from '../base-response';

export interface SeatApiResponse {
  current_seat_category: string;
  current_seat_label: string;
  current_seat_reference: string;
}

export interface TicketApiResponse {
  seats: SeatApiResponse[];
  ticket_id: number;
}

export interface OrderApiResponse {
  order_id: number;
  tickets: TicketApiResponse[];
}

export interface PaginationApiResponse {
  current_page: number;
  next: string | null;
  previous: string | null;
  total_count: number;
  total_pages: number;
}

export interface PaginatedOrdersApiResponse {
  orders: OrderApiResponse[];
  pagination: PaginationApiResponse;
}

export interface SeatingInfoApiResponse {
  data: PaginatedOrdersApiResponse | null;
  error: BaseErrorResponse | null;
}
