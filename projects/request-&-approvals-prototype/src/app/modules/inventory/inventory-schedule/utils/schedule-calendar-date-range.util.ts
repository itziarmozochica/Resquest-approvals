import moment from 'moment-timezone';

import { getWeekDaysInDateRange } from '../components/schedule-calendar-form/utils/schedule-calendar-date.util';
import { ScheduleCalendarPlanDateRange, ScheduleWeekDay } from '../models/schedule-calendar-detail.model';

const PLAN_DATE_FORMAT = 'YYYY-MM-DD';

function nextPlanDate(date: string): string {
  return moment.utc(date, PLAN_DATE_FORMAT).add(1, 'day').format(PLAN_DATE_FORMAT);
}

export function sortDateRanges<T extends ScheduleCalendarPlanDateRange>(dateRanges: T[]): T[] {
  return [...dateRanges].sort((first, second) => first.startDate.localeCompare(second.startDate));
}

export function areDateRangesOverlapping(first: ScheduleCalendarPlanDateRange, second: ScheduleCalendarPlanDateRange): boolean {
  return first.startDate <= second.endDate && first.endDate >= second.startDate;
}

export function findOverlappingDateRange<T extends ScheduleCalendarPlanDateRange>(
  dateRange: ScheduleCalendarPlanDateRange,
  candidates: T[],
): T | null {
  return candidates.find(candidate => areDateRangesOverlapping(dateRange, candidate)) ?? null;
}

export function resolveDateRangeBounds(row: ScheduleCalendarPlanDateRange): ScheduleCalendarPlanDateRange | null {
  const { endDate, startDate } = row;

  if (startDate && endDate && endDate < startDate) {
    return null;
  }

  if (startDate && endDate) {
    return { endDate, startDate };
  }

  if (startDate) {
    return { endDate: startDate, startDate };
  }

  if (endDate) {
    return { endDate, startDate: endDate };
  }

  return null;
}

export function isPlanDateWithinBounds(date: string, bounds: ScheduleCalendarPlanDateRange): boolean {
  return bounds.startDate <= date && date <= bounds.endDate;
}

export function formatDateRangeConflict(bounds: ScheduleCalendarPlanDateRange): string {
  if (bounds.startDate === bounds.endDate) {
    return bounds.startDate;
  }

  return `${bounds.startDate} – ${bounds.endDate}`;
}

export function findDateContainedInAnotherRange(
  date: string,
  candidates: readonly ScheduleCalendarPlanDateRange[],
): ScheduleCalendarPlanDateRange | null {
  for (const candidate of candidates) {
    const bounds = resolveDateRangeBounds(candidate);

    if (bounds && isPlanDateWithinBounds(date, bounds)) {
      return bounds;
    }
  }

  return null;
}

export function toCoverageWindows(dateRanges: ScheduleCalendarPlanDateRange[]): ScheduleCalendarPlanDateRange[] {
  return sortDateRanges(dateRanges).reduce<ScheduleCalendarPlanDateRange[]>((windows, dateRange) => {
    const lastWindow = windows.at(-1);
    if (lastWindow && dateRange.startDate <= nextPlanDate(lastWindow.endDate)) {
      const endDate = dateRange.endDate > lastWindow.endDate ? dateRange.endDate : lastWindow.endDate;
      return [...windows.slice(0, -1), { endDate, startDate: lastWindow.startDate }];
    }
    return [...windows, { endDate: dateRange.endDate, startDate: dateRange.startDate }];
  }, []);
}

export function getWeekDaysInDateRanges(dateRanges: ScheduleCalendarPlanDateRange[], timezone?: string): ScheduleWeekDay[] {
  const weekDays = new Set(dateRanges.flatMap(dateRange => getWeekDaysInDateRange(dateRange.startDate, dateRange.endDate, timezone)));
  return Object.values(ScheduleWeekDay).filter(weekDay => weekDays.has(weekDay));
}
