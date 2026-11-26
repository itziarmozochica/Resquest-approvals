import { BookingListTicketStatus } from './booking-orders.model';

interface SummarizableTicket {
  session_is_timeless?: boolean;
  session_label?: string;
  starts_at?: string;
  ticket_number?: number;
}

interface StatusTicket {
  status?: BookingListTicketStatus;
}

export interface TicketTypeGroup {
  count: number;
  isTimeless: boolean;
  label: string;
  startsAt?: string;
}

export function isOrderCancelled(tickets: StatusTicket[]): boolean {
  return tickets.length > 0 && tickets.every(ticket => ticket.status === 'cancelled');
}

export function activeTickets<T extends StatusTicket>(tickets: T[]): T[] {
  return tickets.filter(ticket => ticket.status !== 'cancelled');
}

/**
 * The ticket "rate" (Adult / Child / …) is the last segment of the session
 * label, which for showcase products is "{bundle} | {rate}". Falls back to the
 * whole label when there is no separator.
 */
function rateLabel(sessionLabel: string | undefined): string {
  const label = (sessionLabel ?? '').trim();
  const segments = label.split('|');
  const rate = segments.length > 1 ? segments[segments.length - 1].trim() : label;
  return rate || '—';
}

/**
 * Groups an order's tickets by rate, sorted alphabetically by rate label so
 * every booking screen shows the same order — the list and detail/reschedule
 * read from different endpoints that return the tickets in different orders.
 * Each ticket carries its own multiplicity in `ticket_number` (the API returns
 * one ticket per rate), so the rate count sums `ticket_number` rather than
 * counting ticket objects.
 */
export function groupTicketTypes(tickets: SummarizableTicket[]): TicketTypeGroup[] {
  const groups = new Map<string, TicketTypeGroup>();
  for (const ticket of tickets) {
    const label = rateLabel(ticket.session_label);
    const units = ticket.ticket_number ?? 1;
    const existing = groups.get(label);
    if (existing) {
      existing.count += units;
    } else {
      groups.set(label, { count: units, isTimeless: ticket.session_is_timeless ?? false, label, startsAt: ticket.starts_at });
    }
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}
