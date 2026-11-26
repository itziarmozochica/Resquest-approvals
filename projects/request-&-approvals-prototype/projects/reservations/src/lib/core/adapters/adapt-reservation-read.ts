import type { BaseResponse } from '@fz/http-models';

import type { Money, MoneyApi } from '../models/money.model';
import type {
  ReservationDiscountModality,
  ReservationOrder,
  ReservationOrderApi,
  ReservationOrderTicket,
  ReservationOrderTicketApi,
  ReservationOrderTicketCode,
  ReservationOrderTicketCodeApi,
} from '../models/reservation-order.model';
import type { Reservation, ReservationApi } from '../models/reservation.model';
import { adaptReservation } from './adapt-reservation';

/**
 * The read answers a three-part envelope. `reservation` is what was booked; `order` and `orders` are the
 * payment's own account of it, and they are the only place per-ticket money exists.
 */
export interface ReservationReadApi {
  order?: ReservationOrderApi | null;
  orders?: ReservationOrderApi[] | null;
  reservation?: ReservationApi | null;
}

export interface ReservationDetail {
  readonly order: ReservationOrder | null;
  readonly orders: readonly ReservationOrder[];
  readonly reservation: Reservation;
}

const WHOLESALE = 'wholesale';

export function adaptReservationRead(response: BaseResponse<ReservationReadApi>): ReservationDetail | null {
  const data = response.data;
  const reservation = data?.reservation;

  if (reservation === undefined || reservation === null) {
    return null;
  }

  const order = data?.order ?? null;

  return {
    order: order === null ? null : adaptOrder(order),
    orders: (data?.orders ?? []).map(entry => adaptOrder(entry)),
    reservation: adaptReservation(reservation),
  };
}

function adaptOrder(order: ReservationOrderApi): ReservationOrder {
  const discountModality = adaptDiscountModality(order.discount_modality);

  return {
    channelType: emptyToNull(order.channel_type),
    discountModality,
    isWholesale: discountModality === WHOLESALE,
    tickets: (order.tickets ?? []).map(ticket => adaptOrderTicket(ticket)),
  };
}

/** An unknown value is not wholesale. Anything else would read a retail price as a distributor's own. */
function adaptDiscountModality(modality: string | null | undefined): ReservationDiscountModality | null {
  return modality === WHOLESALE || modality === 'commission' ? modality : null;
}

function adaptOrderTicket(ticket: ReservationOrderTicketApi): ReservationOrderTicket {
  return {
    codes: (ticket.codes ?? []).flatMap(code => adaptOrderTicketCode(code)),
    holderName: emptyToNull(ticket.user?.fullname),
    id: ticket.id === null || ticket.id === undefined ? null : String(ticket.id),
    price: adaptMoney(ticket.price),
    seats: (ticket.seats ?? []).filter(seat => seat !== ''),
    sessionId: ticket.session?.id ?? null,
    sessionTitle: emptyToNull(ticket.session?.title),
    status: emptyToNull(ticket.status),
    surchargePerTicket: adaptMoney(ticket.surcharge_per_ticket),
    ticketCount: ticket.ticket_count ?? null,
    total: adaptMoney(ticket.total),
    totalPricePerTicket: adaptMoney(ticket.total_price_per_ticket),
    totalSurchargePerTicket: adaptMoney(ticket.total_surcharge_per_ticket),
    unitPrice: adaptMoney(ticket.unit_price),
    units: ticket.units ?? null,
    validatedCount: ticket.validated_count ?? null,
  };
}

/**
 * A code with no code is not a ticket anybody can present, so it is dropped rather than rendered as a
 * blank row — `flatMap` over an empty array is how that happens without a second pass to filter.
 */
function adaptOrderTicketCode(code: ReservationOrderTicketCodeApi): readonly ReservationOrderTicketCode[] {
  const value = emptyToNull(code.code);

  return value === null
    ? []
    : [
        {
          code: value,
          expiresAt: emptyToNull(code.validity?.expiry_date),
          id: code.id ?? null,
          isValidated: code.is_validated === true,
          sessionLabel: emptyToNull(code.session_label),
          spotLabel: emptyToNull(code.spot_label),
          type: code.type === 'barcode' ? 'barcode' : 'qr',
        },
      ];
}

/** The wire uses `''` and `null` interchangeably for "not set"; the domain uses only `null`. */
function emptyToNull(value: string | null | undefined): string | null {
  return value === null || value === undefined || value === '' ? null : value;
}

/**
 * Each of these is a `{amount, currency}` object on the wire (`serialized_ticket.py:24-29`), carrying its
 * own currency. The reservation half of the envelope is the one that splits a bare amount from a separate
 * `currency` field.
 */
function adaptMoney(money: MoneyApi | null | undefined): Money | null {
  return money === null || money === undefined ? null : { amount: money.amount, currency: money.currency };
}
