import { daysBetweenCalendarDays, toCalendarDay } from '../../../core/utils/calendar-day/calendar-day.util';
import type { DaySummary, TimeslotSummary } from '../../models/session-availability-summary.model';
import type { Session } from '../../models/session.model';
import { toInstantMs } from '../filter-to-selected-and-ongoing-day-summaries.util';
import { isPartyEligibleSession } from './party-members.util';

const FALLBACK_TIMEZONE = 'UTC';

/** A naive start time is venue wall clock, read in `timeZone`; an offset-bearing one is an instant. */
export function isStartTimeAtOrAfter(startTime: string, from: number, timeZone: string): boolean {
  const startMs = toInstantMs(startTime, resolveTimeZone(timeZone));

  return startMs !== null && startMs >= from;
}

export function partyTimeslotsOfDay(daySummary: DaySummary, timeZone: string, searchedAt: number): readonly TimeslotSummary[] {
  const timeslots = daySummary.timeslots.filter(
    (timeslot: TimeslotSummary) =>
      isStartTimeAtOrAfter(timeslot.datetime, searchedAt, timeZone) &&
      timeslot.sessions.some((session: Session) => isPartyEligibleSession(session, timeZone)),
  );

  const resolvedTimeZone = resolveTimeZone(timeZone);
  const startMs = (timeslot: TimeslotSummary): number => toInstantMs(timeslot.datetime, resolvedTimeZone) ?? 0;

  return [...timeslots].sort((first: TimeslotSummary, second: TimeslotSummary) => startMs(first) - startMs(second));
}

/** One start time per venue hour, the hour the search ran in left out: "Now" stands for it. */
export function derivePartyStartTimes(daySummary: DaySummary, timeZone: string, searchedAt: number): readonly string[] {
  const earliestByHour = new Map<string, string>();
  const searchHour = Number.isNaN(searchedAt) ? null : venueHourKeyOfInstant(searchedAt, timeZone);

  for (const timeslot of partyTimeslotsOfDay(daySummary, timeZone, searchedAt)) {
    const hour = venueHourKey(timeslot.datetime, timeZone);

    if (hour !== searchHour && !earliestByHour.has(hour)) {
      earliestByHour.set(hour, timeslot.datetime);
    }
  }

  return [...earliestByHour.values()];
}

/** A day after the venue day the search ran on; an unreadable day or search instant is not one. */
export function isPartyDayAfterSearch(daySummary: DaySummary, timeZone: string, searchedAt: number): boolean {
  const day = toCalendarDay(daySummary.date, timeZone);
  const searchDay = toCalendarDay(searchedAt, timeZone);

  return day !== null && searchDay !== null && daysBetweenCalendarDays(searchDay, day) > 0;
}

/**
 * The hour filter the day is read with. "Now" (`null`) only means something on the day of the
 * search; on a later day it reads as the day's first hour, and as `null` when the day has none.
 */
export function resolvePartyHourFilter(
  daySummary: DaySummary | null,
  hourFilter: string | null,
  timeZone: string,
  searchedAt: number,
): string | null {
  if (hourFilter !== null || daySummary === null || !isPartyDayAfterSearch(daySummary, timeZone, searchedAt)) {
    return hourFilter;
  }

  return derivePartyStartTimes(daySummary, timeZone, searchedAt).at(0) ?? null;
}

export function filterTimeslotsFromHour(
  timeslots: readonly TimeslotSummary[],
  hour: string | null,
  timeZone: string,
): readonly TimeslotSummary[] {
  if (hour === null) {
    return timeslots;
  }

  const hourMs = toInstantMs(hour, resolveTimeZone(timeZone));

  if (hourMs === null) {
    return [];
  }

  return timeslots.filter((timeslot: TimeslotSummary) => isStartTimeAtOrAfter(timeslot.datetime, hourMs, timeZone));
}

const venueHourFormatters = new Map<string, Intl.DateTimeFormat>();

function resolveTimeZone(timeZone: string): string {
  return timeZone.length > 0 ? timeZone : FALLBACK_TIMEZONE;
}

function venueHourKey(startTime: string, timeZone: string): string {
  // Only reached for start times `partyTimeslotsOfDay` already parsed.
  return venueHourKeyOfInstant(toInstantMs(startTime, resolveTimeZone(timeZone)) ?? Number.NaN, timeZone);
}

function venueHourKeyOfInstant(instantMs: number, timeZone: string): string {
  const resolvedTimeZone = resolveTimeZone(timeZone);
  let formatter = venueHourFormatters.get(resolvedTimeZone);

  if (formatter === undefined) {
    formatter = createVenueHourFormatter(resolvedTimeZone);
    venueHourFormatters.set(resolvedTimeZone, formatter);
  }

  return formatter.format(instantMs);
}

function createVenueHourFormatter(timeZone: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', hour: '2-digit', hourCycle: 'h23', month: '2-digit', year: 'numeric' };

  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone });
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: FALLBACK_TIMEZONE });
  }
}
