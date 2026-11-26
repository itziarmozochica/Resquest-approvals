import type { Money, MoneyApi } from './money.model';

/**
 * The order side of the reservation read's envelope. The reservation carries what was booked; the order
 * carries what it cost, per ticket line — `session_items_breakdown` on the reservation has no money at
 * all, so this is the only place a distributor's own price can come from.
 */
export interface ReservationOrderTicketSessionApi {
  id?: number | null;
  title?: string | null;
}

export interface ReservationOrderTicketCodeValidityApi {
  activation_date?: string | null;
  expiry_date?: string | null;
}

/** One access ticket: what a person actually presents at the door. `serialized_code.py`. */
export interface ReservationOrderTicketCodeApi {
  code?: string | null;
  id?: number | null;
  is_validated?: boolean | null;
  session_label?: string | null;
  spot_label?: string | null;
  status?: string | null;
  type?: string | null;
  validity?: ReservationOrderTicketCodeValidityApi | null;
}

export interface ReservationOrderTicketUserApi {
  email?: string | null;
  fullname?: string | null;
}

export interface ReservationOrderTicketApi {
  id?: number | null;
  codes?: ReservationOrderTicketCodeApi[] | null;
  price?: MoneyApi | null;
  seats?: string[] | null;
  session?: ReservationOrderTicketSessionApi | null;
  status?: string | null;
  surcharge_per_ticket?: MoneyApi | null;
  ticket_count?: number | null;
  total?: MoneyApi | null;
  total_price_per_ticket?: MoneyApi | null;
  total_surcharge_per_ticket?: MoneyApi | null;
  unit_price?: MoneyApi | null;
  units?: number | null;
  user?: ReservationOrderTicketUserApi | null;
  validated_count?: number | null;
}

export interface ReservationOrderApi {
  channel_type?: string | null;
  discount_modality?: string | null;
  tickets?: ReservationOrderTicketApi[] | null;
}

/**
 * Only `wholesale` is reachable today: the validator refuses `commission` on a b2b cart. It is modelled
 * as a union anyway because the field is what tells the two apart, and a silent third value must not
 * read as wholesale.
 */
export type ReservationDiscountModality = 'commission' | 'wholesale';

/**
 * `qr` or `barcode`, narrowed from a free-form string: the only thing the screen does with it is choose
 * an icon and a label, and an unrecognised value reads as the common case rather than as nothing.
 */
export type ReservationOrderTicketCodeType = 'barcode' | 'qr';

export interface ReservationOrderTicketCode {
  readonly code: string;
  /** When the code stops being admissible. `null` when it never does, or when the read omits it. */
  readonly expiresAt: string | null;
  readonly id: number | null;
  readonly isValidated: boolean;
  /** The per-code line the session breakdown does not carry, e.g. a tier or an add-on name. */
  readonly sessionLabel: string | null;
  readonly spotLabel: string | null;
  readonly type: ReservationOrderTicketCodeType;
}

export interface ReservationOrderTicket {
  readonly id: string | null;
  /** Empty until the order is paid: codes are issued with the purchase, not with the hold. */
  readonly codes: readonly ReservationOrderTicketCode[];
  readonly holderName: string | null;
  readonly price: Money | null;
  /** The join key back to the reservation's own session breakdown, which is where the labels live. */
  readonly sessionId: number | null;
  readonly seats: readonly string[];
  readonly sessionTitle: string | null;
  readonly status: string | null;
  readonly surchargePerTicket: Money | null;
  readonly ticketCount: number | null;
  readonly total: Money | null;
  readonly totalPricePerTicket: Money | null;
  readonly totalSurchargePerTicket: Money | null;
  readonly unitPrice: Money | null;
  readonly units: number | null;
  readonly validatedCount: number | null;
}

export interface ReservationOrder {
  /** The channel type the order was booked under, which answers the origin question ids cannot. */
  readonly channelType: string | null;
  readonly discountModality: ReservationDiscountModality | null;
  /**
   * The gate, derived once here so no caller has to remember it. A ticket's price is the distributor's
   * wholesale price ONLY when the cart was folded at prepare time; otherwise the same field holds the
   * retail price, in the same shape. Showing that to a distributor is the 2026-09-07 bug, so a screen
   * renders a price only when this is true.
   *
   * It is not a price comparison on purpose: reschedules and tax updates can also push `ticket_price`
   * below the configured retail price on a fully retail order, so "lower than retail" does not mean
   * "wholesale".
   */
  readonly isWholesale: boolean;
  readonly tickets: readonly ReservationOrderTicket[];
}
