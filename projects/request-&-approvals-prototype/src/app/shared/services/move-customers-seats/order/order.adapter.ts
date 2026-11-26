import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../models/base-response';
import {
  Order,
  PaginatedOrders,
  PaginatedOrdersApiResponse,
  Seat,
  SeatApiResponse,
  SeatingInfoApiResponse,
  Ticket,
  TicketApiResponse,
} from '../../../models/move-customers-seats';

@Injectable({
  providedIn: 'root',
})
export class OrderAdapter implements AdapterInterface<BaseResponse<PaginatedOrders>> {
  fromApi(response: SeatingInfoApiResponse): BaseResponse<PaginatedOrders> {
    if (response.data) {
      return new BaseResponse<PaginatedOrders>(this.#getData(response.data), null);
    }
    return new BaseResponse<PaginatedOrders>(null, response.error);
  }

  #getData(data: PaginatedOrdersApiResponse): PaginatedOrders {
    const { nextPage, previousPage } = this.#getPreviousAndNextPage(data.pagination.next, data.pagination.previous);
    return {
      orders: data.orders.map(
        (order): Order => ({
          orderId: order.order_id,
          tickets: this.#getTickets(order.tickets),
        }),
      ),
      pagination: {
        currentPage: data.pagination.current_page,
        totalCount: data.pagination.total_count,
        totalPages: data.pagination.total_pages,
        nextPage,
        previousPage,
      },
    };
  }

  #getPreviousAndNextPage(next: string | null, previous: string | null): { nextPage: number | null; previousPage: number | null } {
    const nextPageRaw = next ? new URLSearchParams(next).get('page') : null;
    const previousPageRaw = previous ? new URLSearchParams(previous).get('page') : null;
    const nextPageNumber = nextPageRaw ? Number(nextPageRaw) : NaN;
    const previousPageNumber = previousPageRaw ? Number(previousPageRaw) : NaN;
    return {
      nextPage: isNaN(nextPageNumber) ? null : nextPageNumber,
      previousPage: isNaN(previousPageNumber) ? null : previousPageNumber,
    };
  }

  #getSeats(seats: SeatApiResponse[]): Seat[] {
    return seats.map(
      (seat): Seat => ({
        currentSeatCategory: seat.current_seat_category,
        currentSeatLabel: seat.current_seat_label,
        currentSeatReference: seat.current_seat_reference,
      }),
    );
  }

  #getTickets(tickets: TicketApiResponse[]): Ticket[] {
    return tickets.map(
      (ticket): Ticket => ({
        ticketId: ticket.ticket_id,
        seats: this.#getSeats(ticket.seats),
      }),
    );
  }
}
