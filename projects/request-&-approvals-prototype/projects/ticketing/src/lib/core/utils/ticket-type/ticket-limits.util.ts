import { MaxLimitTicketField } from '../../models/ticket-type/max-limit-ticket-field.enum';
import { MinLimitTicketField } from '../../models/ticket-type/min-limit-ticket-field.enum';
import type { TicketType } from '../../models/ticket-type/ticket-type.model';
import { safeStepQuantity, stepAlignedMax } from './ticket-step.util';

/**
 * Per-ticket quantity bounds — ported from feverzone (§6.7). Framework-agnostic pure functions over
 * the domain {@link TicketType}, driven by the selector's configured `maxLimitField` / `minLimitField`.
 *
 * **Deliberate deviation — step quantity is always on.** Legacy gates the step through
 * `isStepQuantityEnabled`, which defaults to `false` and makes `#getSafeStep` return `1`
 * (`ticket-selector.component.ts:118,307`); it also switches its purchasability rule on the same flag
 * (`:777-779`). The new widget takes the spec's Q1 default (step-quantity on) and always applies
 * `safeStepQuantity`, so there is no flag to port. This is a behaviour change from legacy's *default*
 * config, not from legacy-with-the-flag-on: for `{ minimum: 4, maximum: 11, stepQuantity: 4 }` legacy
 * under default config yields `11` and this util yields `8`. Pinned in the parity checklist.
 *
 * **These functions describe a range; they do not claim it is satisfiable.** `effectiveMax` can fall
 * below `effectiveMin`, and is `Infinity` when the configured ceiling is absent. Ask
 * `canSelectTickets` / `unavailableReason` (`ticket-purchasability.util`) before trusting the bounds.
 */

/** effectiveMin = max(minimum, partySizeMinimum) — feverzone `TicketType.getEffectiveMin()`. */
export function effectiveMin(ticket: TicketType): number {
  return Math.max(ticket.minimum, ticket.partySizeMinimum ?? 0);
}

/**
 * The configured ceiling source — `maximum` or `availableTickets` — per the caller's `maxLimitField`.
 * There is no default here: legacy's lived in `@Input() maxLimitField = MAXIMUM`, and `TicketingConfig`
 * does not carry one yet — every caller passes the field explicitly until the store lands.
 * `undefined` when the chosen field is absent on the ticket.
 */
export function maxLimit(ticket: TicketType, field: MaxLimitTicketField): number | undefined {
  return field === MaxLimitTicketField.AvailableTickets ? ticket.availableTickets : ticket.maximum;
}

/**
 * effectiveMax = stepAlignedMax(effectiveMin, maxLimit, step) — the real, step-aligned ceiling.
 * `Infinity` when the configured ceiling is absent, and possibly below `effectiveMin` when the ticket
 * is misconfigured; both mean "not selectable" — see `ticket-purchasability.util`.
 */
export function effectiveMax(ticket: TicketType, field: MaxLimitTicketField): number {
  return stepAlignedMax(effectiveMin(ticket), maxLimit(ticket, field), safeStepQuantity(ticket.stepQuantity));
}

/**
 * The decrease floor: `None` → 0 (decrement disabled only at 0), `Minimum` → effectiveMin (decrement
 * disabled at the effective minimum; the next step down then collapses to 0).
 */
export function decreaseFloor(ticket: TicketType, field: MinLimitTicketField): number {
  return field === MinLimitTicketField.None ? 0 : effectiveMin(ticket);
}
