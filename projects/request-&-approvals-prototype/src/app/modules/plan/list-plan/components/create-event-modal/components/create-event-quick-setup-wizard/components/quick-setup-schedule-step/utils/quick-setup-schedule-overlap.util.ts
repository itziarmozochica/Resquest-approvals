import {
  CalendarDateFrequency,
  ScheduleWeekDay,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import {
  QuickSetupDayException,
  QuickSetupScheduleFormValue,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';

import { resolveFilledQuickSetupDateRanges } from './quick-setup-schedule-date-range.util';
import { isDateWithinRange, toLocalDateString } from './quick-setup-schedule.util';

const PLAN_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `Date#getDay()` order: Sunday = 0 … Saturday = 6. */
const scheduleWeekDayByJsDay: readonly ScheduleWeekDay[] = [
  ScheduleWeekDay.Sunday,
  ScheduleWeekDay.Monday,
  ScheduleWeekDay.Tuesday,
  ScheduleWeekDay.Wednesday,
  ScheduleWeekDay.Thursday,
  ScheduleWeekDay.Friday,
  ScheduleWeekDay.Saturday,
];

export interface QuickSetupScheduleDayOverlap {
  conflictingDate: string;
  scheduleIndex: number;
}

const parsePlanDate = (dateString: string): Date | null => {
  if (!PLAN_DATE_PATTERN.test(dateString)) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = dateString.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const parsedDate = new Date(year, month - 1, day);

  if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
    return null;
  }

  return parsedDate;
};

const isValidPlanDate = (dateString: string): boolean => parsePlanDate(dateString) !== null;

const parseRecurringDateRange = (startDate: string, endDate: string): { end: Date; start: Date } | null => {
  const start = parsePlanDate(startDate);
  const end = parsePlanDate(endDate);

  if (!start || !end || endDate < startDate) {
    return null;
  }

  return { end, start };
};

const collectDayExceptionDates = (dayExceptions: readonly QuickSetupDayException[]): string[] =>
  dayExceptions.flatMap(exception => exception.dates.filter(Boolean));

const addWeekdayOccurrencesInRange = (
  activeDays: Set<string>,
  startDate: string,
  endDate: string,
  selectedWeekdaySet: Set<ScheduleWeekDay>,
  excludedDates: Set<string>,
): void => {
  const recurringDateRange = parseRecurringDateRange(startDate, endDate);

  if (!recurringDateRange) {
    return;
  }

  const current = new Date(recurringDateRange.start);
  const end = recurringDateRange.end;

  while (current <= end) {
    const weekday = scheduleWeekDayByJsDay[current.getDay()];

    if (selectedWeekdaySet.has(weekday)) {
      const date = toLocalDateString(current);

      if (!excludedDates.has(date)) {
        activeDays.add(date);
      }
    }

    current.setDate(current.getDate() + 1);
  }
};

const addInRangeDayExceptionDates = (
  activeDays: Set<string>,
  dayExceptions: readonly QuickSetupDayException[],
  startDate: string,
  endDate: string,
  excludedDates: Set<string>,
): void => {
  for (const exceptionDate of collectDayExceptionDates(dayExceptions)) {
    if (isDateWithinRange(exceptionDate, startDate, endDate) && !excludedDates.has(exceptionDate)) {
      activeDays.add(exceptionDate);
    }
  }
};

export function resolveScheduleActiveDaysFromValue(formValue: QuickSetupScheduleFormValue | null | undefined): Set<string> {
  if (!formValue) {
    return new Set();
  }

  const dateFrequency = formValue.dateFrequency;

  if (dateFrequency === CalendarDateFrequency.SingleDates) {
    return new Set(formValue.specificDates.filter(isValidPlanDate));
  }

  if (dateFrequency !== CalendarDateFrequency.RecurrentDates) {
    return new Set();
  }

  const selectedWeekdays = formValue.selectedWeekdays;
  const excludedDates = new Set(formValue.excludedDates.filter(Boolean));
  const filledDateRanges = resolveFilledQuickSetupDateRanges(formValue.dateRanges);

  if (filledDateRanges.length === 0) {
    return new Set();
  }

  const activeDays = new Set<string>();
  const selectedWeekdaySet = new Set(selectedWeekdays);

  if (selectedWeekdaySet.size > 0) {
    for (const range of filledDateRanges) {
      addWeekdayOccurrencesInRange(activeDays, range.startDate, range.endDate, selectedWeekdaySet, excludedDates);
    }
  }

  for (const range of filledDateRanges) {
    addInRangeDayExceptionDates(activeDays, formValue.dayExceptions, range.startDate, range.endDate, excludedDates);
  }

  return activeDays;
}

export function findScheduleDayOverlapFromValues(
  scheduleValues: readonly (QuickSetupScheduleFormValue | null | undefined)[],
): QuickSetupScheduleDayOverlap | null {
  const occupiedDays = new Set<string>();

  for (let scheduleIndex = 0; scheduleIndex < scheduleValues.length; scheduleIndex += 1) {
    const scheduleValue = scheduleValues[scheduleIndex];

    if (scheduleValue == null) {
      continue;
    }

    for (const date of resolveScheduleActiveDaysFromValue(scheduleValue)) {
      if (occupiedDays.has(date)) {
        return { conflictingDate: date, scheduleIndex };
      }

      occupiedDays.add(date);
    }
  }

  return null;
}
