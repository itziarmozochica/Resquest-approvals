import { DateUtil } from '@fz-original/app/shared/utils/date.util';
import moment from 'moment-timezone';

import { ScheduleWeekDay } from '../../../models/schedule-calendar-detail.model';

const ALL_WEEK_DAYS: ScheduleWeekDay[] = Object.values(ScheduleWeekDay);
const WEEK_DAYS_COUNT = ALL_WEEK_DAYS.length;
const PLAN_DATE_FORMAT = 'YYYY-MM-DD';

export const getOnlyDateISOString = (date?: string | null): string => {
  if (!date) {
    return '';
  }
  const dateObj = new Date(date);
  return dateObj.toISOString().split('T')[0];
};

const resolveTimezone = (timezone?: string): string => timezone ?? DateUtil.getUserTimeZone();

export const parsePlanDate = (dateString: string, timezone: string): moment.Moment | null => {
  const parsed = moment.tz(dateString, PLAN_DATE_FORMAT, true, timezone).hour(12).minute(0).second(0).millisecond(0);
  return parsed.isValid() ? parsed : null;
};

const getWeekDayIndexFromDate = (dateString: string, timezone: string): number | null => {
  const parsed = parsePlanDate(dateString, timezone);
  if (!parsed) {
    return null;
  }
  return (parsed.isoWeekday() + WEEK_DAYS_COUNT - 1) % WEEK_DAYS_COUNT;
};

/**
 * Returns the weekday for a calendar date string (YYYY-MM-DD).
 * When timezone is omitted, the date is interpreted in the runtime local timezone (browser).
 */
export const getWeekDayFromDate = (dateString: string, timezone?: string): ScheduleWeekDay | null => {
  const index = getWeekDayIndexFromDate(dateString, resolveTimezone(timezone));
  return index === null ? null : (ALL_WEEK_DAYS[index] ?? null);
};

/**
 * Returns weekdays (Mon–Sun order) that fall within an inclusive calendar date range.
 * When timezone is omitted, dates are interpreted in the runtime local timezone (browser).
 */
export const getWeekDaysInDateRange = (startDate: string, endDate: string, timezone?: string): ScheduleWeekDay[] => {
  const resolvedTimezone = resolveTimezone(timezone);
  const start = parsePlanDate(startDate, resolvedTimezone);
  const end = parsePlanDate(endDate, resolvedTimezone);
  if (!start || !end || end.isBefore(start, 'day')) {
    return [];
  }

  const inclusiveDays = end.diff(start, 'days') + 1;
  if (inclusiveDays >= WEEK_DAYS_COUNT) {
    return [...ALL_WEEK_DAYS];
  }

  const startIndex = getWeekDayIndexFromDate(startDate, resolvedTimezone);
  const endIndex = getWeekDayIndexFromDate(endDate, resolvedTimezone);
  if (startIndex === null || endIndex === null) {
    return [];
  }

  const includedDays: ScheduleWeekDay[] = [ALL_WEEK_DAYS[startIndex]];
  let index = startIndex;
  while (index !== endIndex) {
    index = (index + 1) % WEEK_DAYS_COUNT;
    includedDays.push(ALL_WEEK_DAYS[index]);
  }
  return includedDays;
};
