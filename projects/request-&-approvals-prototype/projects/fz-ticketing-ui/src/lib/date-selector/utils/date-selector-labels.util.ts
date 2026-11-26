const DATE_ONLY_PATTERN = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;
const NOON_HOUR = 12;

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

export function formatDatePillDayLabel(date: string, locale: string, timeZone: string): string {
  return formatAtUtcNoon(date, timeZone, getDayFormatter(locale));
}

export function formatDatePillWeekdayLabel(date: string, locale: string, timeZone: string): string {
  return formatAtUtcNoon(date, timeZone, getWeekdayFormatter(locale));
}

/** Unpadded 24h wall-clock label (`9:05`, `21:00`) in the venue timezone — legacy `momentDate: 'H:mm'`. */
export function formatTimeslotTimeLabel(datetime: string, timeZone: string): string {
  const parsed = new Date(datetime);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const parts = getTimeFormatter(timeZone).formatToParts(parsed);
  const hour = Number(partValue(parts, 'hour')) % 24;
  const minute = partValue(parts, 'minute');

  return `${hour}:${minute}`;
}

export function formatTimeslotHourLabel(datetime: string, timeZone: string): string {
  const parsed = new Date(datetime);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return `${Number(partValue(getTimeFormatter(timeZone).formatToParts(parsed), 'hour')) % 24}:00`;
}

/**
 * Both pill labels read the same calendar day, resolved at UTC noon so no timezone can shift it —
 * see the weekday-divergence note in AGENTS.md.
 */
function formatAtUtcNoon(date: string, timeZone: string, formatter: Intl.DateTimeFormat): string {
  const utcNoon = toUtcNoon(date, timeZone);

  return utcNoon === null ? '' : formatter.format(utcNoon);
}

function toUtcNoon(date: string, timeZone: string): Date | null {
  const dateOnly = DATE_ONLY_PATTERN.exec(date)?.groups;

  if (dateOnly) {
    return new Date(Date.UTC(Number(dateOnly.year), Number(dateOnly.month) - 1, Number(dateOnly.day), NOON_HOUR));
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const parts = getCalendarFormatter(timeZone).formatToParts(parsed);

  return new Date(
    Date.UTC(Number(partValue(parts, 'year')), Number(partValue(parts, 'month')) - 1, Number(partValue(parts, 'day')), NOON_HOUR),
  );
}

function getCalendarFormatter(timeZone: string): Intl.DateTimeFormat {
  return getCachedFormatter(dayFormatterCache, `calendar:${timeZone}`, () =>
    Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', timeZone, year: 'numeric' }),
  );
}

function getDayFormatter(locale: string): Intl.DateTimeFormat {
  return getCachedFormatter(dayFormatterCache, `day:${locale}`, () =>
    Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  );
}

function getWeekdayFormatter(locale: string): Intl.DateTimeFormat {
  return getCachedFormatter(weekdayFormatterCache, locale, () => Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }));
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  return getCachedFormatter(timeFormatterCache, timeZone, () =>
    Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, minute: '2-digit', timeZone }),
  );
}

function getCachedFormatter(cache: Map<string, Intl.DateTimeFormat>, key: string, create: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const formatter = create();
  cache.set(key, formatter);

  return formatter;
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find(part => part.type === type)?.value ?? '';
}
