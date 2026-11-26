import { Seat } from './seat.model';

export interface Ticket {
  seats: Seat[];
  ticketId: number;
}
