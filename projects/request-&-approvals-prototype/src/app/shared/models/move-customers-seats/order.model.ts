import { Ticket } from './ticket.model';

export interface Order {
  orderId: number;
  tickets: Ticket[];
}

export interface PaginatedOrders {
  orders: Order[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}
