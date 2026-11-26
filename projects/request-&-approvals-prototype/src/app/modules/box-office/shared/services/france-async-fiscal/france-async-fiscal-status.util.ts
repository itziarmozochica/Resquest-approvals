import {
  CartFiscalSigningState,
  CartPaymentSessionStatus,
  CartPaymentsStatusResponse,
} from '../split-payment/models/split-payment-response.model';

const RELEASE_PENDING_SESSION_STATUSES: ReadonlySet<CartPaymentSessionStatus> = new Set(['awaiting_book_release', 'book_release_ko']);

const RETRYABLE_SIGNING_STATES: ReadonlySet<CartFiscalSigningState> = new Set(['failed', 'not_registered']);

/**
 * A sale whose legs are collected reads as `not_registered` until partners arms its fiscal row, so
 * offering a retry straight away would pop the prompt on every France sale and race the first
 * signing. `failed` needs no wait: it can only be reached after a signing ran.
 */
export const NOT_REGISTERED_SETTLE_MS = 30_000;

/**
 * The legs are collected and partners kept them instead of refunding: the sale is the cashier's to
 * resolve. `in_flight` is deliberately not retryable — a registration is still outstanding, and the
 * cart resolves on its own or ends up with ops.
 */
export function isFiscalSigningRetryable(response: CartPaymentsStatusResponse, awaitingForMs: number): boolean {
  if (response.status !== 'awaiting_book_release' || response.fiscal_signing_state == null) {
    return false;
  }
  if (RETRYABLE_SIGNING_STATES.has(response.fiscal_signing_state) === false) {
    return false;
  }
  return response.fiscal_signing_state !== 'not_registered' || awaitingForMs >= NOT_REGISTERED_SETTLE_MS;
}

export function isAsyncFiscalReleasePendingStatus(status: CartPaymentSessionStatus | undefined): boolean {
  return status !== undefined && RELEASE_PENDING_SESSION_STATUSES.has(status);
}

/**
 * `book_release_ko` is transient: fever2 marks the session `cancelled` right before refunding, so a
 * poll can land after the failure and only ever see `cancelled`. `cancelled` alone is ambiguous — a
 * cashier cancellation ends there too — so it counts as a fiscal failure only when an earlier poll of
 * the same watch already saw the session waiting for (or failing) the book release.
 */
export function isAsyncFiscalFailureStatus(status: CartPaymentSessionStatus | undefined, releasePendingSeen: boolean): boolean {
  if (status === 'book_release_ko') {
    return true;
  }
  return status === 'cancelled' && releasePendingSeen;
}

export function isCartBookingLost(response: CartPaymentsStatusResponse): boolean {
  if (response.cart_is_confirmed === true) {
    return false;
  }
  return response.cart_is_discarded === true || response.cart_is_hold_released === true;
}
