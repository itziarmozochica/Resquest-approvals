import moment from 'moment-timezone';

import type { CheckoutPaymentLinkOption } from '../models/checkout-payment-link.model';
import type { CheckoutContext } from '../models/checkout.model';

const durationPattern = /^(\d{1,2}):([0-5]\d)$/;
const errorKeyBase = 'checkout.paymentLink.errors';

export function parsePaymentLinkDuration(value: string): number | null {
  const match = durationPattern.exec(value.trim());
  return match === null ? null : Number(match[1]) * 60 + Number(match[2]);
}

export function formatPaymentLinkDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function resolvePaymentLinkMinutesLeft(option: CheckoutPaymentLinkOption, now: Date): number {
  return Math.max(Math.floor(moment(option.latestExpiresAt).diff(now, 'minutes', true)), 0);
}

export function resolvePaymentLinkDefaultDuration(option: CheckoutPaymentLinkOption, now: Date): string {
  return formatPaymentLinkDuration(Math.min(option.defaultDurationMinutes, resolvePaymentLinkMinutesLeft(option, now)));
}

export function resolvePaymentLinkDurationErrorKey(value: string, option: CheckoutPaymentLinkOption, now: Date): string | null {
  const minutes = parsePaymentLinkDuration(value);
  if (minutes === null) {
    return `${errorKeyBase}.durationInvalid`;
  }
  if (minutes === 0) {
    return `${errorKeyBase}.durationTooShort`;
  }
  if (minutes > resolvePaymentLinkMinutesLeft(option, now)) {
    return `${errorKeyBase}.durationBeyondSessionDay`;
  }
  return null;
}

export function resolvePaymentLinkExpiresAt(value: string, now: Date): string | null {
  const minutes = parsePaymentLinkDuration(value);
  return minutes === null ? null : moment(now).add(minutes, 'minutes').toISOString();
}

export function formatPaymentLinkInstant(instant: string, timezone: string, locale: string): string {
  return moment.tz(instant, timezone).locale(locale).format('lll');
}

export function canConfirmPaymentLink(context: CheckoutContext, now: Date): boolean {
  return (
    context.paymentLinkSelected &&
    context.paymentLink !== null &&
    resolvePaymentLinkDurationErrorKey(context.paymentLinkDuration, context.paymentLink, now) === null
  );
}
