import moment from 'moment-timezone';

/**
 * Time-of-day section a slot is grouped under in the pickers (kiosk + box office).
 * `night` only exists in the legacy Spanish grouping; the operating-day grouping is three sections.
 */
export type TimeRangeSection = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * `legacy` = the historical Spanish whole-hour buckets (incl. night).
 * `operatingDay` = B2BO-7586 fixed boundaries, minute precision, evening wraps past midnight (no night).
 */
export type TimeRangeGroupingMode = 'legacy' | 'operatingDay';

// Operating-day boundaries as minutes-of-day, inclusive at the lower edge (B2BO-7586).
const OPERATING_MORNING_START = 5 * 60; // 05:00
const OPERATING_AFTERNOON_START = 12 * 60 + 30; // 12:30
const OPERATING_EVENING_START = 17 * 60 + 30; // 17:30

/** Minutes elapsed since midnight in the given timezone (0..1439). */
export function minutesOfDay(datetime: string | Date, timezone: string): number {
  const localTime = moment(datetime).tz(timezone);
  return localTime.hours() * 60 + localTime.minutes();
}

/**
 * Resolve which section a slot belongs to.
 * Both grouping implementations (the shared model and `date-selector-generic`) delegate here so the
 * boundaries can never drift between them.
 */
export function resolveTimeRangeSection(datetime: string | Date, timezone: string, mode: TimeRangeGroupingMode): TimeRangeSection {
  if (mode === 'operatingDay') {
    const minutes = minutesOfDay(datetime, timezone);
    if (minutes >= OPERATING_EVENING_START || minutes < OPERATING_MORNING_START) {
      return 'evening';
    }
    if (minutes >= OPERATING_AFTERNOON_START) {
      return 'afternoon';
    }
    return 'morning';
  }

  const hour = moment(datetime).tz(timezone).hours();
  if (hour >= 22 || hour <= 6) {
    return 'night';
  }
  if (hour <= 14) {
    return 'morning';
  }
  if (hour <= 18) {
    return 'afternoon';
  }
  return 'evening';
}
