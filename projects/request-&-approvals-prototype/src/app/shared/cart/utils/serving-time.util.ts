import moment from 'moment-timezone';

import { CartSession } from '../../models/cart/cart-session.model';

const VENUE_TIME_FORMAT = 'HH:mm';
const VENUE_DATE_FORMAT = 'YYYY-MM-DD';
const DISPLAY_TIME_FORMAT = 'h:mm A';
const DISPLAY_DATE_FORMAT = 'D MMM YYYY';

export function isServingTimeProductLine(session: CartSession): boolean {
  return session.sessionType?.isShopProduct === true;
}

export function canEditServingTimeLine(session: CartSession, cartTimezone: string | null | undefined): boolean {
  return isServingTimeProductLine(session) && servingTimeVenueTimezone(session, cartTimezone) !== null;
}

export function servingTimeVenueTimezone(session: CartSession, cartTimezone: string | null | undefined): string | null {
  for (const candidate of [session.sessionTimezone, cartTimezone]) {
    if (candidate && moment.tz.zone(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function servingInstantToVenueTime(servingAt: string | null | undefined, timezone: string): string {
  if (!servingAt) {
    return '';
  }
  const instant = moment(servingAt);
  return instant.isValid() ? instant.tz(timezone).format(VENUE_TIME_FORMAT) : '';
}

export function servingInstantToVenueDate(servingAt: string | null | undefined, timezone: string): string {
  if (!servingAt) {
    return '';
  }
  const instant = moment(servingAt);
  return instant.isValid() ? instant.tz(timezone).format(VENUE_DATE_FORMAT) : '';
}

export function servingInstantToDisplayTime(servingAt: string | null | undefined, timezone: string): string {
  if (!servingAt) {
    return '';
  }
  const instant = moment(servingAt);
  return instant.isValid() ? instant.tz(timezone).format(DISPLAY_TIME_FORMAT) : '';
}

export function servingInstantToDisplayDate(servingAt: string | null | undefined, timezone: string): string {
  if (!servingAt) {
    return '';
  }
  const instant = moment(servingAt);
  return instant.isValid() ? instant.tz(timezone).format(DISPLAY_DATE_FORMAT) : '';
}

export function venueDateOffset(venueDate: string, referenceDate: string): number {
  if (!venueDate || !referenceDate) {
    return 0;
  }
  const date = moment.utc(venueDate, VENUE_DATE_FORMAT, true);
  const reference = moment.utc(referenceDate, VENUE_DATE_FORMAT, true);
  return date.isValid() && reference.isValid() ? date.diff(reference, 'days') : 0;
}

export function addVenueDays(venueDate: string, days: number): string {
  const date = moment.utc(venueDate, VENUE_DATE_FORMAT, true);
  return date.isValid() ? date.add(days, 'days').format(VENUE_DATE_FORMAT) : venueDate;
}

export function servingTimeDayOffset(
  servingAt: string | null | undefined,
  anchorDate: string | null | undefined,
  timezone: string,
): number {
  if (!servingAt || !anchorDate) {
    return 0;
  }
  const serving = moment(servingAt);
  const anchor = moment(anchorDate);
  if (!serving.isValid() || !anchor.isValid()) {
    return 0;
  }
  const servingDay = moment.tz(serving.tz(timezone).format(VENUE_DATE_FORMAT), VENUE_DATE_FORMAT, timezone);
  const anchorDay = moment.tz(anchor.tz(timezone).format(VENUE_DATE_FORMAT), VENUE_DATE_FORMAT, timezone);
  return servingDay.diff(anchorDay, 'days');
}

export function isSameServingInstant(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) {
    return !left && !right;
  }
  const leftInstant = moment(left);
  const rightInstant = moment(right);
  return leftInstant.isValid() && rightInstant.isValid() && leftInstant.valueOf() === rightInstant.valueOf();
}

export function venueDateTimeToServingInstant(venueDate: string | null | undefined, venueTime: string, timezone: string): string | null {
  const trimmedTime = venueTime.trim();
  if (!trimmedTime || !venueDate) {
    return null;
  }
  const servingAt = moment.tz(`${venueDate} ${trimmedTime}`, `${VENUE_DATE_FORMAT} ${VENUE_TIME_FORMAT}`, timezone);
  return servingAt.isValid() ? servingAt.toISOString() : null;
}

export function servingTimeLineLabel({
  anchorDate,
  cartTimezone,
  session,
  servingTimesBySessionId,
}: {
  anchorDate: string | null | undefined;
  cartTimezone: string | null | undefined;
  session: CartSession;
  servingTimesBySessionId: ReadonlyMap<number, string> | null | undefined;
}): string {
  if (!isServingTimeProductLine(session)) {
    return '';
  }
  const servingAt = servingTimesBySessionId?.get(session.sessionId);
  if (!servingAt) {
    return '';
  }
  const timezone = servingTimeVenueTimezone(session, cartTimezone);
  if (timezone === null) {
    return '';
  }
  const time = servingInstantToDisplayTime(servingAt, timezone);
  const offset = servingTimeDayOffset(servingAt, anchorDate, timezone);
  if (offset === 0) {
    return time;
  }
  return offset > 0 ? `${time} (+${offset})` : `${time} (${offset})`;
}

export function servingTimeAnchorDate(sessionItemsByDatetime: ReadonlyMap<string, CartSession[]> | null | undefined): string | null {
  if (sessionItemsByDatetime == null) {
    return null;
  }
  const activityStarts = [...sessionItemsByDatetime.values()].flat().flatMap((session: CartSession): string[] => {
    const startsAt = session.sessionStartAt;
    return startsAt != null && startsAt.length > 0 && !isServingTimeProductLine(session) ? [startsAt] : [];
  });
  return earliestInstant(activityStarts);
}

function earliestInstant(instants: string[]): string | null {
  return instants.reduce<string | null>((earliest, instant) => {
    const candidate = moment(instant);
    if (!candidate.isValid()) {
      return earliest;
    }
    return earliest === null || candidate.valueOf() < moment(earliest).valueOf() ? instant : earliest;
  }, null);
}
