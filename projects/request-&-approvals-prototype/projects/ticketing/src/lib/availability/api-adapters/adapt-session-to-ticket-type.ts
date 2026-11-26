import type { TicketType } from '../../core/models/ticket-type/ticket-type.model';
import { isMultiDaySession } from '../../core/utils/calendar-day/calendar-day.util';
import type { Session } from '../models/session.model';

/**
 * Folds an availability {@link Session} into the selector row it represents (§6.5/§6.6).
 *
 * The availability payload has no ticket-type list: under a timeslot, **each session _is_ one
 * purchasable row** — it carries its own price, its own quantity bounds and its own step. Legacy
 * folds the same way; this is the adapter that fold has been missing since the domain landed, and
 * the only place a `TicketType` is produced.
 *
 * `sessionType` is nullable on the wire, and its `id` is the row's `ticketTypeId`. Rather than let a
 * gap through as `"undefined"` — which would key every id-less row alike and merge them, the
 * duplicate-cart defect wearing an id-shaped key — this throws, matching `ticketRowKey`'s guard.
 *
 * `timeZone` is the summary's venue timezone: the wire dates carry offsets, and whether a session
 * spans two days is a question about venue calendar days, not about UTC ones.
 */
export function adaptSessionToTicketType(session: Session, timeZone: string): TicketType {
  const { sessionType } = session;

  if (sessionType === null) {
    throw new TypeError(`adaptSessionToTicketType: session ${session.id} has no session_type, so it has no ticket-type identity.`);
  }

  return {
    availableTickets: session.overrideAvailableTickets ?? session.availableTickets,
    b2bPricing: session.b2bPricing ?? undefined,
    details: session.details ?? undefined,
    endsAt: session.endsAt,
    imageUrl: sessionType.imageUrl ?? undefined,
    isAddon: sessionType.isAddOn,
    isHidden: session.isHidden,
    isMultiDay: isMultiDaySession(session.startsAt, session.endsAt, timeZone),
    // Ongoing is a fact of the row against the selected date; the consumer that builds the ongoing
    // rows from earlier day summaries flips it.
    isOngoing: false,
    isPass: sessionType.isPass,
    isPurchasable: session.isPurchasable,
    isShopProduct: sessionType.isShopProduct,
    // `?? undefined` rather than passing `null` through: these ride onto a cart line, where an absent
    // key and an explicit null mean different things to the backend.
    mainPlanId: session.mainPlanId ?? undefined,
    maximum: session.ticketsAllowedPerBooking.maximum,
    minimum: session.ticketsAllowedPerBooking.minimum,
    // `title`, not `name`: the payload carries both, and `title` is the one feverzone renders as the
    // row label (`SessionAvailabilitySummaryAdapter` passes `sessionAvailability.title` into
    // `SessionAvailability.name`). It is also what the explode-pipe hierarchy is encoded in.
    name: session.title,
    partySizeMinimum: sessionType.allowedNumTickets?.minimum,
    placeId: session.placeId ?? undefined,
    price: session.ticketPrice ?? undefined,
    sessionId: session.id,
    startsAt: session.startsAt,
    stepQuantity: sessionType.ticketSelectorStepQuantity,
    strikethroughPrice: session.strikethroughPrice ?? undefined,
    ticketTypeId: String(sessionType.id),
  };
}

/**
 * Folds a timeslot's sessions into its selector rows, preserving payload order.
 *
 * Sessions with no `session_type` are **dropped rather than thrown on**: the single-session adapter
 * keeps its guard, but the usual call site is a consumer's `computed`, where a throw is a render
 * crash Angular caches and rethrows on every later read. Dropping costs one unbookable row; throwing
 * costs the whole widget. Callers that need to know a row went missing can compare lengths.
 */
export function adaptSessionsToTicketTypes(sessions: readonly Session[], timeZone: string): readonly TicketType[] {
  return sessions.filter(session => session.sessionType !== null).map(session => adaptSessionToTicketType(session, timeZone));
}
