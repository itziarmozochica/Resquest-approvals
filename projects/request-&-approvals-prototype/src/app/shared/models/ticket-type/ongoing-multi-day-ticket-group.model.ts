import { TicketType } from './ticket-type.model';

/** Ongoing multi-day bucket shown in the ticket selector (not the date selector). */
export interface OngoingMultiDayTicketGroup {
  /** Preformatted “Start on” date label (venue timezone / locale). */
  startOn: string;
  /** Preformatted “Finishes on” date label; empty when no sessions in bucket. */
  finishOn: string;
  ticketTypes: TicketType[];
}
