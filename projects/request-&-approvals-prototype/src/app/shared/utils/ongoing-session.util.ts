import moment from 'moment-timezone';

import { RegularSessionAvailabilitySummaryByDate } from '../models/session-availability/regular-session-availability-summary-by-date.model';
import { SessionAvailability } from '../models/session-availability/session-availability.model';

const fallbackTimezone = 'UTC';
const openEndedSessionMinimumDurationInDays = 365;
const isoDatetimeWithOffsetPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function toEpochMilliseconds(datetime: string, timezone: string): number {
  return isoDatetimeWithOffsetPattern.test(datetime) ? Date.parse(datetime) : moment.tz(datetime, timezone).valueOf();
}

function reachesIntoDay(session: SessionAvailability, startOfDayMilliseconds: number, timezone: string): boolean {
  if (!session.startsAt || !session.endsAt) {
    return false;
  }
  return (
    toEpochMilliseconds(session.startsAt, timezone) < startOfDayMilliseconds &&
    toEpochMilliseconds(session.endsAt, timezone) >= startOfDayMilliseconds
  );
}

export class OngoingSessionUtil {
  static isOpenEndedSession(session: SessionAvailability): boolean {
    if (!session.startsAt || !session.endsAt) {
      return false;
    }
    return moment(session.endsAt).diff(moment(session.startsAt), 'days') >= openEndedSessionMinimumDurationInDays;
  }

  static isSessionOngoingOnDate(session: SessionAvailability, selectedDate: string, timezone?: string, selectedDatetime?: string): boolean {
    const tz = timezone || fallbackTimezone;
    const startOfSelectedDay = moment.tz(selectedDate, tz).startOf('day');
    if (!reachesIntoDay(session, startOfSelectedDay.valueOf(), tz)) {
      return false;
    }
    if (selectedDatetime === undefined) {
      return true;
    }
    const endsAt = moment.tz(session.endsAt, tz);
    const selectedStart = moment.tz(selectedDatetime, tz);
    const now = moment();
    return selectedStart.isValid() && (endsAt.isAfter(selectedStart) || (startOfSelectedDay.isSameOrBefore(now) && endsAt.isAfter(now)));
  }

  /**
   * A bucket is "ongoing" on the selected date when it contains at least one ongoing session (see
   * isSessionOngoingOnDate). Non-ongoing earlier buckets (e.g. duplicated sessionIds across days) must not be
   * treated as ongoing.
   */
  static isBucketOngoingOnDate(bucket: RegularSessionAvailabilitySummaryByDate, selectedDate: string, timezone: string): boolean {
    const tz = timezone || fallbackTimezone;
    const startOfSelectedDay = moment.tz(selectedDate, tz).startOf('day').valueOf();
    for (const datetimeSlot of bucket.sessionAvailabilityByDatetimeList) {
      for (const session of datetimeSlot.sessionAvailabilityList) {
        if (reachesIntoDay(session, startOfSelectedDay, tz)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Keeps the selected (latest) date bucket plus any earlier bucket that is ongoing on the selected date.
   * Used on the two-request path so ongoing multi-day buckets survive instead of being dropped by a plain
   * "keep last date" slice.
   *
   * The selected bucket is the one with the latest date (ongoing buckets are always earlier), found by value
   * rather than by position, and is always kept exactly once (reference match).
   */
  static filterToSelectedAndOngoingBuckets(
    buckets: RegularSessionAvailabilitySummaryByDate[],
    timezone: string,
  ): RegularSessionAvailabilitySummaryByDate[] {
    if (buckets.length <= 1) {
      return buckets;
    }
    const selectedBucket = buckets.reduce((latest, bucket) => (bucket.date > latest.date ? bucket : latest), buckets[0]);
    const selectedDate = selectedBucket.date;
    return buckets.filter(bucket => bucket === selectedBucket || OngoingSessionUtil.isBucketOngoingOnDate(bucket, selectedDate, timezone));
  }

  static sessionIdsFromBuckets(
    buckets: RegularSessionAvailabilitySummaryByDate[],
    selectedDate: string | undefined,
    timezone: string | undefined,
  ): Set<number> {
    const ids = new Set<number>();
    if (selectedDate === undefined) {
      return ids;
    }
    const tz = timezone || fallbackTimezone;
    const startOfSelectedDay = moment.tz(selectedDate, tz).startOf('day').valueOf();
    for (const bucket of buckets) {
      for (const datetimeSlot of bucket.sessionAvailabilityByDatetimeList) {
        for (const session of datetimeSlot.sessionAvailabilityList) {
          if (!reachesIntoDay(session, startOfSelectedDay, tz)) {
            continue;
          }
          ids.add(session.id);
        }
      }
    }
    return ids;
  }
}
