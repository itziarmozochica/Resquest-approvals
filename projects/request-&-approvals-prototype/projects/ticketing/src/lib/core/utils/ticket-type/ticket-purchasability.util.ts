import type { MaxLimitTicketField } from '../../models/ticket-type/max-limit-ticket-field.enum';
import type { TicketType } from '../../models/ticket-type/ticket-type.model';
import { TicketUnavailableReason } from '../../models/ticket-type/ticket-unavailable-reason.enum';
import { effectiveMax, effectiveMin, maxLimit } from './ticket-limits.util';

/**
 * Whether a row is selectable, and why not when it isn't — ported from feverzone
 * `updateInputsDisableStatus`'s `canSelectTickets` (`ticket-selector.component.ts:776-779`),
 * step-quantity-enabled branch (see the always-on note in `ticket-limits.util`).
 *
 * This is the §6.9 single source of truth: `effectiveMin`/`effectiveMax` describe a range and make
 * no claim that the range is non-empty — an inverted range (`minimum: 2, maximum: 1`, legacy fixture
 * `ticketTypeMinGreaterThanMax`) and an absent ceiling (`effectiveMax` → `Infinity`) both mean
 * "not selectable", and only this module says so. Callers must ask here before trusting the bounds.
 */

/** The reason a row is not selectable, or `undefined` when it is. Precedence matches legacy. */
export function unavailableReason(ticket: TicketType, field: MaxLimitTicketField): TicketUnavailableReason | undefined {
  if (!ticket.isPurchasable) {
    return TicketUnavailableReason.NotPurchasable;
  }
  const ceiling = maxLimit(ticket, field);
  if (typeof ceiling !== 'number' || !Number.isFinite(ceiling)) {
    return TicketUnavailableReason.NoDefinedCeiling;
  }
  const max = effectiveMax(ticket, field);
  if (max < effectiveMin(ticket) || max <= 0) {
    return TicketUnavailableReason.SoldOut;
  }
  return undefined;
}

/** Whether any quantity can be selected for this row — legacy `canSelectTickets`. */
export function canSelectTickets(ticket: TicketType, field: MaxLimitTicketField): boolean {
  return unavailableReason(ticket, field) === undefined;
}
