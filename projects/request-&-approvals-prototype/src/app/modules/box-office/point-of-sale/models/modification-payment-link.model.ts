/** B2B status codes (`{entity}{action:02d}{error:04d}`) the modification payment link can fail with. */
export enum ModificationReservationErrorCode {
  CartHoldExpired = '23010128',
  CartNotPrepared = '23010127',
  CustomerRequired = '23010132',
  ExpirationInThePast = '23010133',
  ModificationAlreadyPending = '25060171',
  ModificationSuperseded = '23010129',
  NotAModificationCart = '23010126',
  NothingToPay = '23010131',
  OrderNotModifiable = '23010130',
}

/** The code the POS gives a failure with no B2B body, so it cannot tell whether the reservation was created. */
export const modificationReservationUnknownErrorCode = 'UNKNOWN_ERROR';

export enum ModificationPaymentLinkExpiryError {
  BeyondSessionDay = 'beyond_session_day',
  Invalid = 'invalid',
  InThePast = 'in_the_past',
}

export interface ModificationReservationCustomerDto {
  email: string;
  name: string;
  user_id: number;
}

export interface ModificationReservationDto {
  cart_id: string;
  customer: ModificationReservationCustomerDto;
  expires_at: string;
  main_plan_id: number;
  reservation_id: string;
}

export interface ModificationReservationRequestDto {
  expires_at: string;
}

export interface ModificationReservationCustomer {
  email: string;
  name: string;
  userId: number;
}

export interface ModificationReservation {
  cartId: string;
  customer: ModificationReservationCustomer;
  expiresAt: string;
  mainPlanId: number;
  reservationId: string;
}

export interface ModificationReservationQuery {
  cartId: string;
  expiresAt: string;
  partnerId: number;
}

export interface ModificationReservationErrorOutcome {
  isExpiryError: boolean;
  messageKey: string;
  returnsToConfirm: boolean;
}

export interface PosModificationPaymentLink {
  availableLanguages: string[];
  cartId: string;
  customerEmail: string;
  defaultLanguage: string;
  expiresAt: string;
  placeId: number;
  planId: number;
  reservationId: string;
}

export class ModificationPaymentLinkExpiryValidationError extends Error {
  constructor(readonly reason: ModificationPaymentLinkExpiryError) {
    super(`Invalid modification payment link expiry: ${reason}`);
  }
}
