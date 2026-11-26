import { Money } from '@fz-original/app/shared/models/money.model';

import { CHECKOUT_BOOKING_SOLD_OUT_REASON } from '../models/checkout-payment-failure-reason.model';
import type { CheckoutContext } from '../models/checkout.model';
import { fromCents, toCents } from './checkout-split.util';

const SOLD_OUT_COLLECTED_MESSAGE_KEY = 'checkout.paymentFailed.soldOut.message';

const SOLD_OUT_NOTHING_CHARGED_MESSAGE_KEY = 'checkout.paymentFailed.soldOut.nothingCharged';

const DEFAULT_CANCEL_CONFIRMATION_MESSAGE_KEY = 'checkout.cancelConfirmation.message';

const SOLD_OUT_REFUNDED_CANCEL_CONFIRMATION_MESSAGE_KEY = 'checkout.cancelConfirmation.soldOut.refunded';

const SOLD_OUT_REFUND_PENDING_CANCEL_CONFIRMATION_MESSAGE_KEY = 'checkout.cancelConfirmation.soldOut.refundPending';

/** Reads the same two amounts as `hasRecordedPayments`, so the copy and the cancel buttons agree on whether to refund. */
export function checkoutCollectedAmount(context: CheckoutContext): Money | null {
  const collectedCents = Math.max(toCents(context.paidAmount?.amount ?? 0), toCents(context.sessionPaidAmount?.amount ?? 0));
  if (collectedCents <= 0) {
    return null;
  }
  const currency = context.cartTotal?.currency ?? context.sessionPaidAmount?.currency ?? context.paidAmount?.currency ?? 'EUR';
  return new Money(fromCents(collectedCents), currency);
}

export function isSoldOutFailure(context: CheckoutContext): boolean {
  return context.paymentFailureReason === CHECKOUT_BOOKING_SOLD_OUT_REASON;
}

/**
 * fever2 may already have completed the split session once every leg is paid, and its cancel does not
 * refund a completed session right away (the card legs come back with its stale-session sweep).
 */
export function isSoldOutAfterFullPayment(context: CheckoutContext): boolean {
  if (!isSoldOutFailure(context)) {
    return false;
  }
  const collected = checkoutCollectedAmount(context);
  const totalCents = toCents(context.cartTotal?.amount ?? 0);
  return collected !== null && totalCents > 0 && toCents(collected.amount) >= totalCents;
}

export function resolveSoldOutMessageKey(context: CheckoutContext): string {
  return checkoutCollectedAmount(context) === null ? SOLD_OUT_NOTHING_CHARGED_MESSAGE_KEY : SOLD_OUT_COLLECTED_MESSAGE_KEY;
}

export function resolveCancelConfirmationMessageKey(context: CheckoutContext): string {
  if (!isSoldOutFailure(context)) {
    return DEFAULT_CANCEL_CONFIRMATION_MESSAGE_KEY;
  }
  return isSoldOutAfterFullPayment(context)
    ? SOLD_OUT_REFUND_PENDING_CANCEL_CONFIRMATION_MESSAGE_KEY
    : SOLD_OUT_REFUNDED_CANCEL_CONFIRMATION_MESSAGE_KEY;
}

export function formatCheckoutCollectedAmount(context: CheckoutContext): string {
  return checkoutCollectedAmount(context)?.toString(context.locale) ?? '';
}
