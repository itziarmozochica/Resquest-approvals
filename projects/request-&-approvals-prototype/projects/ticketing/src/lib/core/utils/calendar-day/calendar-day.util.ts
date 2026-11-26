export interface CalendarDay {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

export type RelativeCalendarDay = 'today' | 'tomorrow' | 'yesterday';

const ABSOLUTE_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/u;
const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/u;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const FALLBACK_TIMEZONE = 'UTC';
const RELATIVE_DAYS_BY_OFFSET: ReadonlyMap<number, RelativeCalendarDay> = new Map([
  [-1, 'yesterday'],
  [0, 'today'],
  [1, 'tomorrow'],
]);

const calendarDayFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The venue calendar day a date-time falls on. An offset-bearing or `Z` string, or a timestamp, is
 * an instant and is read in `timeZone`; a naive wall-clock string is already venue-local, so its date
 * part is the day. Anything else is `null`: an unparsable date is unusable, not an exception.
 */
export function toCalendarDay(dateTime: number | string, timeZone: string): CalendarDay | null {
  if (typeof dateTime === 'number') {
    return Number.isNaN(dateTime) ? null : instantToCalendarDay(dateTime, timeZone);
  }

  if (ABSOLUTE_INSTANT_PATTERN.test(dateTime)) {
    const instantMs = Date.parse(dateTime);

    return Number.isNaN(instantMs) ? null : instantToCalendarDay(instantMs, timeZone);
  }

  if (WALL_CLOCK_PATTERN.test(dateTime)) {
    return wallClockToCalendarDay(dateTime);
  }

  return null;
}

/** Midnight UTC of the day, the instant to hand `Intl.DateTimeFormat` with `timeZone: 'UTC'` to print it. */
export function calendarDayToUtcMs(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day);
}

/** Whole days from `from` to `to`: positive when `to` is later. */
export function daysBetweenCalendarDays(from: CalendarDay, to: CalendarDay): number {
  return Math.round((calendarDayToUtcMs(to) - calendarDayToUtcMs(from)) / MILLISECONDS_PER_DAY);
}

/**
 * A session is multi-day when it ends on a later venue day than it starts, so a late show from 23:00
 * to 00:15 is multi-day on the day it starts. Port of the Point of Sale rule, with `Intl` in place of
 * moment.
 */
export function isMultiDaySession(startsAt: string, endsAt: string, timeZone: string): boolean {
  const startDay = toCalendarDay(startsAt, timeZone);
  const endDay = toCalendarDay(endsAt, timeZone);

  return startDay !== null && endDay !== null && daysBetweenCalendarDays(startDay, endDay) > 0;
}

/**
 * The word for a day adjacent to today: yesterday, today or tomorrow. Any other day is `null`, and
 * the caller prints the date, so a far end reads as its date instead of a vague word.
 */
export function relativeCalendarDay(day: CalendarDay, today: CalendarDay): RelativeCalendarDay | null {
  return RELATIVE_DAYS_BY_OFFSET.get(daysBetweenCalendarDays(today, day)) ?? null;
}

function instantToCalendarDay(instantMs: number, timeZone: string): CalendarDay {
  const parts = getCalendarDayFormatter(timeZone).formatToParts(instantMs);

  return { day: partValue(parts, 'day'), month: partValue(parts, 'month'), year: partValue(parts, 'year') };
}

function wallClockToCalendarDay(wallClock: string): CalendarDay | null {
  // Fixed-width date part: YYYY-MM-DD.
  const day: CalendarDay = {
    day: Number(wallClock.slice(8, 10)),
    month: Number(wallClock.slice(5, 7)),
    year: Number(wallClock.slice(0, 4)),
  };
  const roundTrip = new Date(calendarDayToUtcMs(day));

  // "2026-02-30" matches the pattern but is no calendar day: `Date.UTC` rolls it into March.
  const isRealDay =
    roundTrip.getUTCFullYear() === day.year && roundTrip.getUTCMonth() === day.month - 1 && roundTrip.getUTCDate() === day.day;

  return isRealDay ? day : null;
}

function getCalendarDayFormatter(timeZone: string): Intl.DateTimeFormat {
  const resolvedTimeZone = timeZone.length > 0 ? timeZone : FALLBACK_TIMEZONE;
  const cached = calendarDayFormatters.get(resolvedTimeZone);

  if (cached !== undefined) {
    return cached;
  }

  const formatter = createCalendarDayFormatter(resolvedTimeZone);
  calendarDayFormatters.set(resolvedTimeZone, formatter);

  return formatter;
}

function createCalendarDayFormatter(timeZone: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric', year: 'numeric' };

  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone });
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: FALLBACK_TIMEZONE });
  }
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find(part => part.type === type)?.value);
}
