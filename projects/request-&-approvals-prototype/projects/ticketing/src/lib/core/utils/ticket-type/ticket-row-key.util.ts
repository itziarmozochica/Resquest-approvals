import type { TicketType } from '../../models/ticket-type/ticket-type.model';

/**
 * The row key quantities are emitted under (§6.5) — **the output contract**, not internal math, which
 * is why this is the one util re-exported from the public API.
 *
 * A row is a **(session, ticket type) pair**, not a ticket type: the same ticket type appears once per
 * session, so `ticketTypeId` alone is only unique while exactly one session is on screen. Legacy keys
 * its form controls by `sessionId` for this reason (`ticket-selector.component.ts:163,749-762`), and
 * box-office needs several sessions live at once (`allowMultiSession`, ongoing multi-day rows). Keying
 * by the pair is correct in both cases — in the single-session marketplace flow the session part is
 * simply constant.
 *
 * The result is **opaque**: build keys with this function, compare them, use them as map keys — never
 * parse one. Carry `sessionId` / `ticketTypeId` alongside if you need the parts back.
 */
export function ticketRowKey(ticket: Pick<TicketType, 'sessionId' | 'ticketTypeId'>): string {
  const { sessionId, ticketTypeId } = ticket;
  if (!Number.isFinite(sessionId) || typeof ticketTypeId !== 'string' || ticketTypeId === '') {
    // Guarded rather than coerced: `String(undefined)` would key every id-less row as "undefined" and
    // silently merge them — the duplicate-cart defect (R2) wearing an id-shaped key. Adapters must
    // reject or synthesize a key instead of passing wire gaps through (see TicketType.ticketTypeId).
    throw new TypeError(`ticketRowKey: a row needs both sessionId and ticketTypeId (got ${sessionId} / ${ticketTypeId}).`);
  }
  return `${sessionId}:${ticketTypeId}`;
}
