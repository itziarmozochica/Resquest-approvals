import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { validate as isUuid } from 'uuid';

export const reservationSettlementMode = 'reservation_settlement';

export type ReservationSettlementQueryParams = Readonly<Record<string, string | null | undefined>>;

export type ReservationSettlementRejectionReason =
  | 'already_purchased'
  | 'cart_not_found'
  | 'cart_unavailable'
  | 'empty_cart'
  | 'invalid_params'
  | 'not_prepared';

export interface ReservationSettlementEntry {
  readonly cartId: string;
  readonly reservationId: string;
}

export interface ReservationSettlementSession {
  readonly cart: Cart;
  readonly cartId: string;
  readonly partnerId: number;
  readonly reservationId: string;
}

export interface ReservationSettlementStartParams {
  readonly partnerId: number;
  readonly queryParams: ReservationSettlementQueryParams;
}

export interface ReservationSettlementStarted {
  readonly session: ReservationSettlementSession;
  readonly status: 'started';
}

export interface ReservationSettlementRejected {
  readonly reason: ReservationSettlementRejectionReason;
  readonly status: 'rejected';
}

export type ReservationSettlementStartResult = ReservationSettlementRejected | ReservationSettlementStarted;

export function validateReservationSettlementEntry(queryParams: ReservationSettlementQueryParams): ReservationSettlementEntry | null {
  if (queryParams['mode'] !== reservationSettlementMode) {
    return null;
  }

  const cartId = queryParams['reservation_cart_id'];

  if (cartId == null || !isUuid(cartId)) {
    return null;
  }

  const reservationId = queryParams['reservation_id'];

  if (reservationId == null || !isUuid(reservationId)) {
    return null;
  }

  return { cartId, reservationId };
}
