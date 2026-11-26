import type { PaymentFailureCategory } from '@fz-original/app/payments/models/payments.model';
import { isPaymentFailureCategory } from '@fz-original/app/payments/models/payments.model';

import {
  CHECKOUT_BOOKING_SOLD_OUT_REASON,
  CHECKOUT_PAYMENT_ALREADY_TAKEN_REASON,
  CHECKOUT_SHIFT_REQUIRED_REASON,
  CHECKOUT_TAP_TO_PAY_APP_UPDATE_REQUIRED_REASON,
  CHECKOUT_TAP_TO_PAY_NOT_READY_REASON,
} from '../models/checkout-payment-failure-reason.model';

const DEFAULT_PAYMENT_FAILURE_MESSAGE_KEY = 'checkout.paymentFailed.message';

const DEFAULT_CHECKOUT_FAILURE_MESSAGE_KEY = 'checkout.checkoutFailed.message';

const PAYMENT_ALREADY_TAKEN_MESSAGE_KEY = 'checkout.paymentFailed.alreadyTaken';

const BOOKING_SOLD_OUT_MESSAGE_KEY = 'checkout.paymentFailed.soldOut.message';

const DEFAULT_PAYMENT_FAILURE_TITLE_KEY = 'checkout.paymentFailed.title';

const BOOKING_SOLD_OUT_TITLE_KEY = 'checkout.paymentFailed.soldOut.title';

const PAYMENT_FAILURE_CATEGORY_MESSAGE_KEYS: Record<PaymentFailureCategory, string> = {
  CARD_BLOCKED: 'checkout.paymentFailed.category.cardBlocked',
  CARD_DECLINED: 'checkout.paymentFailed.category.cardDeclined',
  CARD_EXPIRED: 'checkout.paymentFailed.category.cardExpired',
  GATEWAY_ERROR: 'checkout.paymentFailed.category.gatewayError',
  INSUFFICIENT_FUNDS: 'checkout.paymentFailed.category.insufficientFunds',
  TERMINAL_BUSY: 'checkout.paymentFailed.category.terminalBusy',
  TERMINAL_UNAVAILABLE: 'checkout.paymentFailed.category.terminalUnavailable',
  TIMEOUT: 'checkout.paymentFailed.category.timeout',
  UNKNOWN: DEFAULT_PAYMENT_FAILURE_MESSAGE_KEY,
  UNSUPPORTED_CARD: 'checkout.paymentFailed.category.unsupportedCard',
  USER_CANCELLED: 'checkout.paymentFailed.category.userCancelled',
  WRONG_PIN: 'checkout.paymentFailed.category.wrongPin',
};

const collectorMismatchErrorCode = 31010009;
const legCollectorMismatchBeforeChargeErrorCode = 31010108;
const collectorContextUnresolvedErrorCode = 31010109;

const bookingFailureMessageKeyByCode: ReadonlyMap<number, string> = new Map([
  [collectorMismatchErrorCode, 'errors.31010009'],
  [legCollectorMismatchBeforeChargeErrorCode, 'errors.31010108'],
  [collectorContextUnresolvedErrorCode, 'errors.31010109'],
]);

const bookingFailureReasonPrefixes: readonly string[] = ['', 'errors.', 'errors.adyen.'];

const bookingFailureMessageKeyByReason: ReadonlyMap<string, string> = new Map(
  [...bookingFailureMessageKeyByCode].flatMap(([code, messageKey]) =>
    bookingFailureReasonPrefixes.map((prefix): [string, string] => [`${prefix}${code}`, messageKey]),
  ),
);

const bookingFailureCodeByReason: ReadonlyMap<string, string> = new Map(
  [...bookingFailureMessageKeyByCode.keys()].flatMap(code =>
    bookingFailureReasonPrefixes.map((prefix): [string, string] => [`${prefix}${code}`, String(code)]),
  ),
);

const shiftRequiredErrorCode = 'SHIFT_REQUIRED';

const DEFAULT_SESSION_CANCEL_FAILURE_MESSAGE_KEY = 'checkout.cancelFailed.message';

/** Cancel-specific copy for categories whose payment wording would mislead on the cancel-failed step. */
const SESSION_CANCEL_FAILURE_MESSAGE_KEY_OVERRIDES: Partial<Record<PaymentFailureCategory, string>> = {
  TIMEOUT: 'checkout.cancelFailed.timeout',
  UNKNOWN: DEFAULT_SESSION_CANCEL_FAILURE_MESSAGE_KEY,
};

/** Reasons that already are their own translatable message key, shown as is on both failure steps. */
const PASSTHROUGH_FAILURE_REASONS: ReadonlySet<string> = new Set([
  CHECKOUT_SHIFT_REQUIRED_REASON,
  CHECKOUT_TAP_TO_PAY_APP_UPDATE_REQUIRED_REASON,
  CHECKOUT_TAP_TO_PAY_NOT_READY_REASON,
]);

function isPassthroughFailureReason(reason: string | null): reason is string {
  return reason !== null && PASSTHROUGH_FAILURE_REASONS.has(reason);
}

export function resolveCheckoutFailureMessageKey(reason: string | null): string {
  if (isPassthroughFailureReason(reason)) {
    return reason;
  }
  return DEFAULT_CHECKOUT_FAILURE_MESSAGE_KEY;
}

/**
 * Maps a payment failure reason to a translatable message key for the payment-failed screen.
 *
 * Reasons arrive as machine vocabulary — a backend {@link PaymentFailureCategory}, an internal error
 * sentinel, a raw backend error string or an RxJS timeout message — none of which is fit to show a
 * cashier verbatim. Only known categories and allowlisted booking codes map to a specific message;
 * anything unmapped falls back to the generic failure copy instead of leaking the raw value into the UI.
 */
export function resolvePaymentFailureMessageKey(reason: string | null): string {
  if (reason === CHECKOUT_PAYMENT_ALREADY_TAKEN_REASON) {
    return PAYMENT_ALREADY_TAKEN_MESSAGE_KEY;
  }
  if (reason === CHECKOUT_BOOKING_SOLD_OUT_REASON) {
    return BOOKING_SOLD_OUT_MESSAGE_KEY;
  }
  if (isPassthroughFailureReason(reason)) {
    return reason;
  }
  const bookingFailureMessageKey = reason === null ? undefined : bookingFailureMessageKeyByReason.get(reason);
  if (bookingFailureMessageKey !== undefined) {
    return bookingFailureMessageKey;
  }
  if (reason !== null && isPaymentFailureCategory(reason)) {
    return PAYMENT_FAILURE_CATEGORY_MESSAGE_KEYS[reason];
  }
  return DEFAULT_PAYMENT_FAILURE_MESSAGE_KEY;
}

export function resolvePaymentFailureTitleKey(reason: string | null): string {
  return reason === CHECKOUT_BOOKING_SOLD_OUT_REASON ? BOOKING_SOLD_OUT_TITLE_KEY : DEFAULT_PAYMENT_FAILURE_TITLE_KEY;
}

export function findBookingFailureCode(error: unknown): string | undefined {
  return readErrorCodeCandidates(error)
    .map(candidate => toBookingFailureCode(candidate))
    .find(code => code !== undefined);
}

/** True when partners refused the sale because the operator has no open shift (`409 SHIFT_REQUIRED`). */
export function isShiftRequiredError(error: unknown): boolean {
  return readErrorCodeCandidates(error).includes(shiftRequiredErrorCode);
}

function readErrorCodeCandidates(error: unknown): unknown[] {
  if (error === null || typeof error !== 'object') {
    return [];
  }
  const nested = 'error' in error ? error.error : undefined;
  return [...readCodeCandidates(error), ...readCodeCandidates(nested)];
}

function readCodeCandidates(source: unknown): unknown[] {
  if (source === null || typeof source !== 'object') {
    return [];
  }
  return ['errorCode' in source ? source.errorCode : undefined, 'code' in source ? source.code : undefined];
}

function toBookingFailureCode(candidate: unknown): string | undefined {
  if (typeof candidate === 'number') {
    return bookingFailureMessageKeyByCode.has(candidate) ? String(candidate) : undefined;
  }
  if (typeof candidate === 'string') {
    return bookingFailureCodeByReason.get(candidate);
  }
  return undefined;
}

/**
 * Maps a whole-session cancellation failure reason to a translatable message key for the
 * cancel-failed step, mirroring {@link resolvePaymentFailureMessageKey}: only known machine
 * categories map to specific copy (with cancel-specific overrides where the payment wording would
 * mislead), anything else falls back to the generic cancel-failed message.
 */
export function resolveSessionCancelFailureMessageKey(reason: string | null): string {
  if (reason !== null && isPaymentFailureCategory(reason)) {
    return SESSION_CANCEL_FAILURE_MESSAGE_KEY_OVERRIDES[reason] ?? PAYMENT_FAILURE_CATEGORY_MESSAGE_KEYS[reason];
  }
  return DEFAULT_SESSION_CANCEL_FAILURE_MESSAGE_KEY;
}
