import type { TimeslotSummary } from '@fz/ticketing';

import type { FztTimeRangeGroupingMode, FztTimeRangeSection } from '../models/time-range-section.model';

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

// Operating-day boundaries as minutes-of-day, inclusive at the lower edge (B2BO-7586).
const OPERATING_MORNING_START = 5 * MINUTES_PER_HOUR;
const OPERATING_AFTERNOON_START = 12 * MINUTES_PER_HOUR + 30;
const OPERATING_EVENING_START = 17 * MINUTES_PER_HOUR + 30;

const LEGACY_NIGHT_FROM_HOUR = 22;
const LEGACY_NIGHT_UNTIL_HOUR = 6;
const LEGACY_MORNING_UNTIL_HOUR = 14;
const LEGACY_AFTERNOON_UNTIL_HOUR = 18;

/** Render order of the day-part sections; `night` never fills in `operatingDay` grouping. */
export const FZT_TIME_RANGE_SECTION_ORDER: readonly FztTimeRangeSection[] = ['morning', 'afternoon', 'evening', 'night'];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function minutesOfDay(datetime: string, timeZone: string): number {
  const parts = getFormatter(timeZone).formatToParts(new Date(datetime));

  return (partValue(parts, 'hour') % HOURS_PER_DAY) * MINUTES_PER_HOUR + partValue(parts, 'minute');
}

export function resolveFztTimeRangeSection(datetime: string, timeZone: string, mode: FztTimeRangeGroupingMode): FztTimeRangeSection {
  const minutes = minutesOfDay(datetime, timeZone);

  if (mode === 'operatingDay') {
    if (minutes >= OPERATING_EVENING_START || minutes < OPERATING_MORNING_START) {
      return 'evening';
    }

    return minutes >= OPERATING_AFTERNOON_START ? 'afternoon' : 'morning';
  }

  const hour = Math.floor(minutes / MINUTES_PER_HOUR);

  if (hour >= LEGACY_NIGHT_FROM_HOUR || hour <= LEGACY_NIGHT_UNTIL_HOUR) {
    return 'night';
  }

  if (hour <= LEGACY_MORNING_UNTIL_HOUR) {
    return 'morning';
  }

  return hour <= LEGACY_AFTERNOON_UNTIL_HOUR ? 'afternoon' : 'evening';
}

/** Groups a day's timeslots by day part; empty sections are absent and slot order is preserved. */
export function bucketizeTimeslots(
  timeslots: readonly TimeslotSummary[],
  timeZone: string,
  mode: FztTimeRangeGroupingMode,
): ReadonlyMap<FztTimeRangeSection, readonly TimeslotSummary[]> {
  const bySection = new Map<FztTimeRangeSection, TimeslotSummary[]>();

  for (const timeslot of timeslots) {
    const section = resolveFztTimeRangeSection(timeslot.datetime, timeZone, mode);
    const bucket = bySection.get(section);

    if (bucket) {
      bucket.push(timeslot);
    } else {
      bySection.set(section, [timeslot]);
    }
  }

  const ordered = new Map<FztTimeRangeSection, readonly TimeslotSummary[]>();

  for (const section of FZT_TIME_RANGE_SECTION_ORDER) {
    const bucket = bySection.get(section);

    if (bucket !== undefined) {
      ordered.set(section, bucket);
    }
  }

  return ordered;
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);

  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone,
  });
  formatterCache.set(timeZone, formatter);

  return formatter;
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find(part => part.type === type)?.value);
}
