import type { DaySummary } from '../models/session-availability-summary.model';
import type { Session } from '../models/session.model';
import { wallClockToNaiveUtc } from './wall-clock-to-naive-utc.util';

const FALLBACK_TIMEZONE = 'UTC';
const DATE_ONLY_LENGTH = 10;

const ABSOLUTE_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/u;
const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/u;

export function filterToSelectedAndOngoingDaySummaries(
  daySummaries: readonly DaySummary[],
  timezone: string,
  selectedDate?: string,
): readonly DaySummary[] {
  if (daySummaries.length <= 1) {
    return daySummaries;
  }

  const resolvedTimezone = resolveTimezone(timezone);
  const selectedDaySummary = resolveSelectedDaySummary(daySummaries, selectedDate);

  if (selectedDaySummary === undefined) {
    return daySummaries;
  }

  const selectedDayStartMs = toDayStartMs(selectedDaySummary.date, resolvedTimezone);

  if (selectedDayStartMs === null) {
    return daySummaries;
  }

  return daySummaries.filter(
    daySummary => daySummary === selectedDaySummary || isDaySummaryOngoingAt(daySummary, selectedDayStartMs, resolvedTimezone),
  );
}

export function isDaySummaryOngoingOnDate(daySummary: DaySummary, selectedDate: string, timezone: string): boolean {
  const resolvedTimezone = resolveTimezone(timezone);
  const selectedDayStartMs = toDayStartMs(selectedDate, resolvedTimezone);

  return selectedDayStartMs !== null && isDaySummaryOngoingAt(daySummary, selectedDayStartMs, resolvedTimezone);
}

export interface OngoingSessionInstants {
  readonly now?: number;
  readonly selectedDatetime: string | null;
}

export function isSessionOngoingOnDate(
  session: Session,
  selectedDate: string,
  timezone: string,
  { now = Date.now(), selectedDatetime }: OngoingSessionInstants,
): boolean {
  const resolvedTimezone = resolveTimezone(timezone);
  const selectedDayStartMs = toDayStartMs(selectedDate, resolvedTimezone);

  if (selectedDayStartMs === null || !isSessionOngoingAt(session, selectedDayStartMs, resolvedTimezone)) {
    return false;
  }

  if (selectedDatetime === null) {
    return true;
  }

  const endsAtMs = toInstantMs(session.endsAt, resolvedTimezone);
  const selectedDatetimeMs = toInstantMs(selectedDatetime, resolvedTimezone);

  if (endsAtMs === null || selectedDatetimeMs === null) {
    return false;
  }

  return endsAtMs > selectedDatetimeMs || (selectedDayStartMs <= now && endsAtMs > now);
}

function resolveSelectedDaySummary(daySummaries: readonly DaySummary[], selectedDate: string | undefined): DaySummary | undefined {
  // Without an explicit date the legacy `.slice(-1)` assumption applies: ascending order, last = selected.
  if (selectedDate === undefined) {
    return daySummaries[daySummaries.length - 1];
  }

  return daySummaries.find(daySummary => daySummary.date === selectedDate);
}

function isDaySummaryOngoingAt(daySummary: DaySummary, selectedDayStartMs: number, timeZone: string): boolean {
  return daySummary.timeslots.some(timeslot =>
    timeslot.sessions.some(session => isSessionOngoingAt(session, selectedDayStartMs, timeZone)),
  );
}

function isSessionOngoingAt(session: Session, selectedDayStartMs: number, timeZone: string): boolean {
  const startsAtMs = toInstantMs(session.startsAt, timeZone);
  const endsAtMs = toInstantMs(session.endsAt, timeZone);

  if (startsAtMs === null || endsAtMs === null) {
    return false;
  }

  return startsAtMs < selectedDayStartMs && endsAtMs >= selectedDayStartMs;
}

function resolveTimezone(timezone: string): string {
  return timezone.length > 0 ? timezone : FALLBACK_TIMEZONE;
}

// The ongoing boundary is the start of the selected calendar day (legacy `startOf('day')`), so a
// wall-clock date carrying a time component is truncated to its date part before converting.
function toDayStartMs(date: string, timeZone: string): number | null {
  if (WALL_CLOCK_PATTERN.test(date)) {
    return toInstantMs(date.slice(0, DATE_ONLY_LENGTH), timeZone);
  }

  return toInstantMs(date, timeZone);
}

/** The instant of a date-time: an offset-bearing string as sent, a naive one as venue wall clock in `timeZone`. */
export function toInstantMs(value: string, timeZone: string): number | null {
  if (ABSOLUTE_INSTANT_PATTERN.test(value)) {
    return normalizeMs(Date.parse(value));
  }

  // A string can match the wall-clock shape without being a real calendar date ("2026-02-30");
  // those are unusable datetimes, not exceptions — same contract as strings that never match.
  if (WALL_CLOCK_PATTERN.test(value)) {
    try {
      return normalizeMs(Date.parse(`${wallClockToNaiveUtc(value, timeZone)}Z`));
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeMs(milliseconds: number): number | null {
  return Number.isNaN(milliseconds) ? null : milliseconds;
}
