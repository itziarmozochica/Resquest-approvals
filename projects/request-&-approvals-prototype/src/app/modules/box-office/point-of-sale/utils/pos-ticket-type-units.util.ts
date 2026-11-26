import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';

// Whether a row can take the units carried under its name from another timeslot (see AGENTS.md, the selection seam).
export function canTicketTypeCarryUnits(ticketType: TicketType, units: number): boolean {
  if (units <= 0) {
    return true;
  }

  if (!ticketType.isPurchasable) {
    return false;
  }

  if (ticketType.availableTickets === undefined) {
    return true;
  }

  return ticketType.availableTickets + (ticketType.overrideAvailableTickets ?? 0) >= units;
}
