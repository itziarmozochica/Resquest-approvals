import { Cart, PRODUCTS_GROUP_KEY } from '@fz-original/app/shared/models/cart/cart.model';
import moment, { type Moment } from 'moment-timezone';

import { ModificationPaymentLinkExpiryError } from '../models/modification-payment-link.model';

export function resolveSessionDayEnd(cart: Cart, timezone: string): Moment | null {
  const sessionStarts: Moment[] = Array.from(cart.sessionItemsByDatetime.keys())
    .filter((datetime: string) => datetime !== PRODUCTS_GROUP_KEY)
    .map((datetime: string) => moment.tz(datetime, timezone))
    .filter((sessionStart: Moment) => sessionStart.isValid());
  if (sessionStarts.length === 0) {
    return null;
  }
  return moment.max(sessionStarts).clone().endOf('day');
}

export function validateExpiresAt(expiresAt: string, now: Moment, sessionDayEnd: Moment | null): ModificationPaymentLinkExpiryError | null {
  const expiry = moment(expiresAt, moment.ISO_8601, true);
  if (!expiry.isValid() || sessionDayEnd === null) {
    return ModificationPaymentLinkExpiryError.Invalid;
  }
  if (!expiry.isAfter(now)) {
    return ModificationPaymentLinkExpiryError.InThePast;
  }
  if (expiry.isAfter(sessionDayEnd)) {
    return ModificationPaymentLinkExpiryError.BeyondSessionDay;
  }
  return null;
}

export function formatExpiryForDisplay(expiresAt: string, timezone: string, locale: string): string {
  return moment.tz(expiresAt, timezone).locale(locale).format('LLL');
}
