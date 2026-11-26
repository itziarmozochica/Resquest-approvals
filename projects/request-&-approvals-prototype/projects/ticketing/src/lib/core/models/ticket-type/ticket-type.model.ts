import type { B2bPricing } from '../money/b2b-pricing.model';
import type { Money } from '../money/money.model';

/**
 * A purchasable ticket type — one row in the selector. Domain model (camelCase), ported from
 * feverzone `TicketType` as a plain interface (not the legacy positional-constructor class).
 *
 * Quantities are keyed by `ticketRowKey(ticket)`, never by `name` (§6.5) and never by `ticketTypeId`
 * alone: a row is a **(session, ticket type) pair**. Two distinct types can share a display name, and
 * the same type recurs across sessions — see `ticket-row-key.util`.
 */
export interface TicketType {
  isPurchasable: boolean;
  minimum: number;
  /** Display name; may encode explode-pipe levels joined by ` | ` (see explode-pipe.util). */
  name: string;
  /** Session this row belongs to — part of the row key (§6.5), and the cart line's session. */
  sessionId: number;
  /**
   * The ticket type's own identity, **stable across sessions** — so not a row key on its own; compose
   * one with `ticketRowKey`.
   *
   * **Adapter precondition:** required and non-empty. Legacy has no such field: its domain model
   * carries an optional `id?: number` filled from `session?.sessionType?.id`
   * (`session-availability-summary.model.ts:76`) — a *session-type* id shared by every session of the
   * same type — while box-office's ongoing rows pass `sessionId` into that slot instead
   * (`oss-ticket-selector.component.spec.ts:560`). So an adapter doing `String(ticket.id)` would both
   * key id-less rows as `"undefined"` and merge the same type across sessions. The B2BR-5474 adapter
   * must reject or synthesize a value rather than pass a wire gap through; `ticketRowKey` throws if it
   * gets one anyway.
   */
  ticketTypeId: string;
  availableTickets?: number;
  b2bPricing?: B2bPricing;
  /**
   * Operator-authored HTML describing what this ticket type includes — fever2's
   * `SessionType.details`, offered on the wire as `Session.details`. Display only: it never rides
   * onto a cart line, so it is dropped rather than nulled when the wire has nothing.
   */
  details?: string;
  /** The session's end, as the wire carries it. With `startsAt`, the dates a multi-day tile shows. */
  endsAt?: string;
  imageUrl?: string;
  isAddon?: boolean;
  /** Operator-hidden inventory — legacy segregates these rows (`showInHiddenSection`). */
  isHidden?: boolean;
  /**
   * The session ends on a later venue day than it starts (`isMultiDaySession`). A fact of the session,
   * so the adapter settles it; the row is multi-day on its first day too.
   */
  isMultiDay?: boolean;
  /**
   * The session started on an earlier venue day and still runs on the selected one. A fact of the row
   * against a selected date, not of the session alone, so the adapter leaves it `false` and the
   * consumer that builds the ongoing rows sets it (`isDaySummaryOngoingOnDate`).
   */
  isOngoing?: boolean;
  isPass?: boolean;
  isShopProduct?: boolean;
  /**
   * The plan this session belongs to — the cart line's `main_plan_id`.
   *
   * Optional because the wire field is (`main_plan_id?`), and `undefined` rather than `null` so it
   * simply drops out of a request body instead of asserting "no plan".
   */
  mainPlanId?: number;
  maximum?: number;
  /** Party-size floor folded into the effective minimum (`getEffectiveMin`). */
  partySizeMinimum?: number;
  /** The place this session is sold at — the cart line's `place_id`. Optional for the same reason. */
  placeId?: number;
  price?: Money;
  priceWithDiscount?: Money;
  /** The session's start, as the wire carries it. */
  startsAt?: string;
  stepQuantity?: number;
  /** Original price shown struck-through when a discount applies. */
  strikethroughPrice?: Money;
}
