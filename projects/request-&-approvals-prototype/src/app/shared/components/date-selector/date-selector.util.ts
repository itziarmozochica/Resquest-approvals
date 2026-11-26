import moment from 'moment-timezone';

import { TicketTimeGranularity } from '../../models/order/ticket-time-granularity.enum';
import { SESSION_SELECTOR_TYPE_BOOKING_TIME_GRANULARITY } from '../../services/session-availability/session-selector-type-booking-time-granularity.const';
import { SessionSelectorType } from '../../services/session-availability/session-selector-type.enum';

export function getDateSelectorTitleKey(sessionSelectorType: SessionSelectorType, hideDateSelector: boolean): string {
  if (hideDateSelector) {
    return 'boxOffice.schedule';
  }

  const bookingTimeGranularity = SESSION_SELECTOR_TYPE_BOOKING_TIME_GRANULARITY[sessionSelectorType];

  return bookingTimeGranularity === TicketTimeGranularity.DATE ? 'boxOffice.datePickerLabel' : 'boxOffice.dateSession';
}

function toResolvedUtcDate(dateStr: string, timezone: string, includeTime: boolean): Date | null {
  if (!dateStr) {
    return null;
  }
  const m = moment.tz(dateStr, timezone);
  if (!m.isValid()) {
    return null;
  }
  return includeTime
    ? new Date(Date.UTC(m.year(), m.month(), m.date(), m.hour(), m.minute()))
    : new Date(Date.UTC(m.year(), m.month(), m.date(), 12, 0, 0));
}

const SHORT_DATE_WITH_YEAR: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC', year: 'numeric' };
const TIME_24H: Intl.DateTimeFormatOptions = { hour: '2-digit', hour12: false, minute: '2-digit' };

function formatResolved(dateStr: string, locale: string, timezone: string, options: Intl.DateTimeFormatOptions): string {
  const resolved = toResolvedUtcDate(dateStr, timezone, options.hour !== undefined);
  return resolved ? new Intl.DateTimeFormat(locale, options).format(resolved) : '';
}

export function formatLocalDate(dateStr: string, locale: string, timezone: string): string {
  const resolved = toResolvedUtcDate(dateStr, timezone, false);
  if (!resolved) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(resolved);
}

/**
 * Short date with year, no time (locale-aware). Structurally the date portion of {@link formatLocalDateTime}:
 * both share {@link SHORT_DATE_WITH_YEAR}, so the two cannot drift apart.
 * - en: "Apr 13, 2026"
 * - es: "13 abr 2026"
 */
export const formatLocalDateWithYear = (dateStr: string, locale: string, timezone: string): string =>
  formatResolved(dateStr, locale, timezone, SHORT_DATE_WITH_YEAR);

/**
 * Event date with short weekday and short month, locale-aware. Follows CLDR casing.
 * - en: "Thu, Dec 31, 2026"
 * - es: "jue, 31 dic 2026"
 * - ja: "2026年12月31日(木)"
 * - ko: "2026년 12월 31일 (목)"
 */
/**
 * Weekday length overrides for timeslot header labels (default: long, legacy LLLL).
 * Locales not listed use Intl long weekday.
 */
const TIMESLOT_HEADER_WEEKDAY_BY_LANG: Readonly<Partial<Record<string, 'short' | 'long'>>> = {
  he: 'short',
};

function weekdayForTimeslotHeader(locale: string): 'short' | 'long' {
  const lang = locale?.split('-')[0]?.toLowerCase() ?? 'en';
  return TIMESLOT_HEADER_WEEKDAY_BY_LANG[lang] ?? 'long';
}

function formatTimeslotHeaderDateTime(date: Date, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
    timeZone: timezone,
    weekday: weekdayForTimeslotHeader(locale),
    year: 'numeric',
  }).format(date);
}

/**
 * Timeslot table header label: date + time, locale-aware.
 * - en: "Thursday, June 10, 2021 at 1:00 PM"
 * - he: "שבת, 27 ביוני 2026 בשעה 13:00"
 */
export function formatTimeslotHeaderLabel(date: Date, locale: string, timezone: string): string {
  return formatTimeslotHeaderDateTime(date, locale, timezone);
}

/**
 * Timeslot header date: weekday, day, long month, year (locale-aware).
 * - en: "Saturday, June 27, 2026"
 * - he: "שבת, 27 ביוני 2026"
 */
export function formatLocalWeekdayLongMonthDate(date: Date, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
    weekday: weekdayForTimeslotHeader(locale),
    year: 'numeric',
  }).format(date);
}

/**
 * @deprecated Prefer {@link formatTimeslotHeaderLabel} for timeslot header rows.
 */
export function formatLocalWeekdayLongMonthDateTime(date: Date, locale: string, timezone: string): string {
  return formatTimeslotHeaderDateTime(date, locale, timezone);
}

export function formatLocalFullDate(dateStr: string, locale: string, timezone: string): string {
  const resolved = toResolvedUtcDate(dateStr, timezone, false);
  if (!resolved) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(resolved);
}

/**
 * Short date + time (24h), locale-aware, weekday omitted. The date portion is {@link SHORT_DATE_WITH_YEAR},
 * shared with {@link formatLocalDateWithYear}; the time is {@link TIME_24H}.
 * - en: "Apr 13, 2026, 16:03"
 * - es: "13 abr 2026, 16:03"
 * - ja: "2026年4月13日 16:03"
 * - ko: "2026년 4월 13일 16:03"
 */
export const formatLocalDateTime = (dateStr: string, locale: string, timezone: string): string =>
  formatResolved(dateStr, locale, timezone, { ...SHORT_DATE_WITH_YEAR, ...TIME_24H });
