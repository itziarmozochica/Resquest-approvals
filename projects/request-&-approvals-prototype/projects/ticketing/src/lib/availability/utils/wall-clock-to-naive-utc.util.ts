const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MINUTE_PRECISION_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/u;
const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/u;

const HOURS_PER_DAY = 24;
// IANA offsets range from UTC−12 to UTC+14; probing both sides of that window
// samples DST and standard offsets without depending on the UTC bootstrap.
const MAX_IANA_OFFSET_MS = 14 * 60 * 60 * 1000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

interface WallClockParts {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
}

export function wallClockToNaiveUtc(wallClock: string, timeZone: string): string {
  return formatNaiveUtc(resolveInstantMs(validWallClockAsUtcMs(wallClock), timeZone));
}

export function wallClockToLocalDate(wallClock: string): string {
  return formatNaiveUtc(validWallClockAsUtcMs(wallClock)).slice(0, 10);
}

function validWallClockAsUtcMs(wallClock: string): number {
  const parts = parseWallClock(wallClock);
  const wallClockAsUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  if (!isSameUtcCalendar(wallClockAsUtcMs, parts)) {
    throw new RangeError(`"${wallClock}" is not a valid calendar date-time.`);
  }

  return wallClockAsUtcMs;
}

function resolveInstantMs(wallClockAsUtcMs: number, timeZone: string): number {
  const beforeOffsetMs = timeZoneOffsetMs(wallClockAsUtcMs - MAX_IANA_OFFSET_MS, timeZone);
  const afterOffsetMs = timeZoneOffsetMs(wallClockAsUtcMs + MAX_IANA_OFFSET_MS, timeZone);
  const beforeCandidateMs = wallClockAsUtcMs - beforeOffsetMs;
  const afterCandidateMs = wallClockAsUtcMs - afterOffsetMs;
  const isBeforeValid = isOffsetAt(beforeCandidateMs, beforeOffsetMs, timeZone);
  const isAfterValid = isOffsetAt(afterCandidateMs, afterOffsetMs, timeZone);

  if (isBeforeValid && isAfterValid) {
    // Overlap (fall-back): Temporal `compatible` / `earlier`.
    return Math.min(beforeCandidateMs, afterCandidateMs);
  }

  if (isBeforeValid) {
    return beforeCandidateMs;
  }

  if (isAfterValid) {
    return afterCandidateMs;
  }

  // Gap (spring-forward): Temporal `compatible` / `later`.
  return Math.max(beforeCandidateMs, afterCandidateMs);
}

function isOffsetAt(instantMs: number, expectedOffsetMs: number, timeZone: string): boolean {
  return timeZoneOffsetMs(instantMs, timeZone) === expectedOffsetMs;
}

function isSameUtcCalendar(utcMs: number, { day, hour, minute, month, second, year }: WallClockParts): boolean {
  const date = new Date(utcMs);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

function parseWallClock(wallClock: string): WallClockParts {
  const normalized = withFullTime(wallClock);

  if (!WALL_CLOCK_PATTERN.test(normalized)) {
    throw new RangeError(`"${wallClock}" is not a YYYY-MM-DD[THH:mm[:ss]] wall-clock string.`);
  }

  // Fixed-width once normalized: YYYY-MM-DDTHH:mm:ss.
  return {
    day: Number(normalized.slice(8, 10)),
    hour: Number(normalized.slice(11, 13)),
    minute: Number(normalized.slice(14, 16)),
    month: Number(normalized.slice(5, 7)),
    second: Number(normalized.slice(17, 19)),
    year: Number(normalized.slice(0, 4)),
  };
}

function withFullTime(wallClock: string): string {
  if (DATE_ONLY_PATTERN.test(wallClock)) {
    return `${wallClock}T00:00:00`;
  }

  return MINUTE_PRECISION_PATTERN.test(wallClock) ? `${wallClock}:00` : wallClock;
}

function timeZoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = getFormatter(timeZone).formatToParts(new Date(instantMs));
  const localAsUtcMs = Date.UTC(
    partValue(parts, 'year'),
    partValue(parts, 'month') - 1,
    partValue(parts, 'day'),
    // `% 24` normalizes ICU builds that render midnight as hour 24 (h24 cycle).
    partValue(parts, 'hour') % HOURS_PER_DAY,
    partValue(parts, 'minute'),
    partValue(parts, 'second'),
  );

  return localAsUtcMs - instantMs;
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);

  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  });
  formatterCache.set(timeZone, formatter);

  return formatter;
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find(part => part.type === type)?.value);
}

function formatNaiveUtc(instantMs: number): string {
  const date = new Date(instantMs);
  const datePart = `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
  const timePart = `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}`;

  return `${datePart}T${timePart}`;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}
