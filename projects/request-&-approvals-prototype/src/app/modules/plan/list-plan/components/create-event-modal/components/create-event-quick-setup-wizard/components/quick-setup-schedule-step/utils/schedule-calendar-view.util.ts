import {
  CalendarDateFrequency,
  ScheduleWeekDay,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import {
  QuickSetupRecurrentDateRangeRow,
  QuickSetupScheduleFormValue,
  quickSetupWeekdays,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import moment from 'moment-timezone';

import {
  ScheduleCalendarMonthCell,
  ScheduleCalendarMonthDayMark,
  ScheduleCalendarMonthWeeks,
  ScheduleCalendarViewSchedulePill,
  ScheduleCalendarViewVm,
} from '../models/schedule-calendar-view.model';
import {
  getQuickSetupMaxAllowedDateForTimezone,
  getQuickSetupMinAllowedDateForTimezone,
  quickSetupScheduleMaxMonthsAhead,
} from '../quick-setup-schedule-step.validators';
import { getQuickSetupScheduleColorKey } from './quick-setup-schedule-color.util';
import {
  isDateWithinAnyQuickSetupDateRange,
  resolveFilledQuickSetupDateRanges,
  resolveQuickSetupDateRangeEnvelope,
} from './quick-setup-schedule-date-range.util';
import { resolveScheduleActiveDaysFromValue } from './quick-setup-schedule-overlap.util';

const daysInWeek = 7;
const monthKeyLength = 7;
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const planDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const toScheduleCalendarMonthKey = (ymd: string): string | null => (isComparablePlanDate(ymd) ? ymd.slice(0, monthKeyLength) : null);

export type ScheduleCalendarScrollToMonthRequest = Readonly<{ monthKey: string }>;
const calendarPreviewMaxActiveDays = 370;
const defaultLocaleFirstDay = 1;
const fallbackCalendarLocale = 'en';
/** 2024-01-07 was a Sunday — anchor for locale weekday labels. */
const aSundayUtc = Date.UTC(2024, 0, 7);

export interface ScheduleDaysSnapshot {
  activeDays: ReadonlySet<string>;
  exceptionDays: ReadonlySet<string>;
  excludedDays: ReadonlySet<string>;
}

interface IntlLocaleWeekInfo {
  firstDay: number;
}

interface IntlLocaleWithWeekInfo {
  weekInfo?: IntlLocaleWeekInfo;
  getWeekInfo?: () => IntlLocaleWeekInfo;
}

function isIntlLocaleWithWeekInfo(locale: Intl.Locale): locale is Intl.Locale & IntlLocaleWithWeekInfo {
  return 'getWeekInfo' in locale || 'weekInfo' in locale;
}

export interface ScheduleCalendarViewScheduleInput extends ScheduleDaysSnapshot {
  name: string;
  scheduleIndex: number;
}

export interface ScheduleCalendarSnapshot extends ScheduleDaysSnapshot {
  scheduleIndex: number;
}

function collectDayExceptionDates(formValue: QuickSetupScheduleFormValue): string[] {
  return formValue.dayExceptions.flatMap(exception => exception.dates.filter(Boolean));
}

/** Recurring schedules: excluded dates within the configured range. */
export function resolveScheduleExcludedDaysFromValue(formValue: QuickSetupScheduleFormValue | null | undefined): Set<string> {
  if (!formValue || formValue.dateFrequency !== CalendarDateFrequency.RecurrentDates) {
    return new Set();
  }

  const recurrentDateRanges = resolveFilledQuickSetupDateRanges(formValue.dateRanges);

  if (recurrentDateRanges.length === 0) {
    return new Set();
  }

  return new Set(formValue.excludedDates.filter(date => isDateWithinAnyQuickSetupDateRange(date, recurrentDateRanges)));
}

/** Recurring schedules: exception dates in range that are not excluded. */
export function resolveScheduleExceptionDaysFromValue(formValue: QuickSetupScheduleFormValue | null | undefined): Set<string> {
  if (!formValue || formValue.dateFrequency !== CalendarDateFrequency.RecurrentDates) {
    return new Set();
  }

  const recurrentDateRanges = resolveFilledQuickSetupDateRanges(formValue.dateRanges);
  const excluded = new Set(formValue.excludedDates.filter(Boolean));

  if (recurrentDateRanges.length === 0) {
    return new Set();
  }

  return new Set(
    collectDayExceptionDates(formValue).filter(
      date => isDateWithinAnyQuickSetupDateRange(date, recurrentDateRanges) && !excluded.has(date),
    ),
  );
}

const isComparablePlanDate = (date: string): boolean => planDatePattern.test(date);

const resolvePreviewDateRanges = (
  formValue: QuickSetupScheduleFormValue,
  minAllowedDate: string,
  maxAllowedDate: string,
): QuickSetupRecurrentDateRangeRow[] => {
  const previewRanges: QuickSetupRecurrentDateRangeRow[] = [];

  for (const range of resolveFilledQuickSetupDateRanges(formValue.dateRanges)) {
    if (range.endDate < minAllowedDate || range.startDate > maxAllowedDate) {
      continue;
    }

    previewRanges.push({
      endDate: range.endDate > maxAllowedDate ? maxAllowedDate : range.endDate,
      startDate: range.startDate < minAllowedDate ? minAllowedDate : range.startDate,
    });
  }

  return previewRanges;
};

export function normalizeFormValueForCalendarPreview(
  formValue: QuickSetupScheduleFormValue,
  timezone: string,
): QuickSetupScheduleFormValue {
  const maxAllowedDate = getQuickSetupMaxAllowedDateForTimezone(timezone);
  const minAllowedDate = getQuickSetupMinAllowedDateForTimezone(timezone);

  if (formValue.dateFrequency === CalendarDateFrequency.SingleDates) {
    return {
      ...formValue,
      specificDates: formValue.specificDates.filter(
        date => Boolean(date) && isComparablePlanDate(date) && date >= minAllowedDate && date <= maxAllowedDate,
      ),
    };
  }

  if (formValue.dateFrequency !== CalendarDateFrequency.RecurrentDates) {
    return formValue;
  }

  const envelope = resolveQuickSetupDateRangeEnvelope(resolveFilledQuickSetupDateRanges(formValue.dateRanges));

  if (!isComparablePlanDate(envelope.startDate) || !isComparablePlanDate(envelope.endDate)) {
    return {
      ...formValue,
      excludedDates: formValue.excludedDates.filter(Boolean),
    };
  }

  const previewDateRanges = resolvePreviewDateRanges(formValue, minAllowedDate, maxAllowedDate);

  return {
    ...formValue,
    dateRanges: previewDateRanges.length > 0 ? previewDateRanges : [],
    excludedDates: formValue.excludedDates.filter(Boolean),
  };
}

export function resolveScheduleActiveDaysForCalendarPreview(previewValue: QuickSetupScheduleFormValue): Set<string> {
  const activeDays = resolveScheduleActiveDaysFromValue(previewValue);

  if (activeDays.size <= calendarPreviewMaxActiveDays) {
    return activeDays;
  }

  return new Set([...activeDays].sort().slice(0, calendarPreviewMaxActiveDays));
}

export function buildScheduleDaysSnapshot(formValue: QuickSetupScheduleFormValue, timezone = 'UTC'): ScheduleDaysSnapshot {
  const previewValue = normalizeFormValueForCalendarPreview(formValue, timezone);

  return {
    activeDays: resolveScheduleActiveDaysForCalendarPreview(previewValue),
    exceptionDays: resolveScheduleExceptionDaysFromValue(previewValue),
    excludedDays: resolveScheduleExcludedDaysFromValue(previewValue),
  };
}

export function buildScheduleCalendarViewScheduleInput(
  formValue: QuickSetupScheduleFormValue,
  scheduleIndex: number,
  timezone = 'UTC',
): ScheduleCalendarViewScheduleInput {
  return {
    name: formValue.name,
    scheduleIndex,
    ...buildScheduleDaysSnapshot(formValue, timezone),
  };
}

function resolveDominantScheduleIndex(participants: readonly number[], selectedScheduleIndex: number): number {
  if (participants.includes(selectedScheduleIndex)) {
    return selectedScheduleIndex;
  }

  return Math.min(...participants);
}

export function resolveDayMark(
  ymd: string,
  snapshots: readonly ScheduleCalendarSnapshot[],
  selectedScheduleIndex: number,
): ScheduleCalendarMonthDayMark | null {
  const activeParticipants = snapshots.filter(snapshot => snapshot.activeDays.has(ymd)).map(snapshot => snapshot.scheduleIndex);

  if (activeParticipants.length > 0) {
    const dominantScheduleIndex = resolveDominantScheduleIndex(activeParticipants, selectedScheduleIndex);
    const dominantSnapshot = snapshots.find(snapshot => snapshot.scheduleIndex === dominantScheduleIndex);

    return {
      dominantScheduleIndex,
      isActiveSelected: dominantScheduleIndex === selectedScheduleIndex,
      isException: dominantSnapshot?.exceptionDays.has(ymd) ?? false,
      kind: 'active',
      participatingScheduleIndices: activeParticipants,
      ymd,
    };
  }

  const excludedParticipants = snapshots.filter(snapshot => snapshot.excludedDays.has(ymd)).map(snapshot => snapshot.scheduleIndex);

  if (excludedParticipants.length === 0) {
    return null;
  }

  const dominantScheduleIndex = resolveDominantScheduleIndex(excludedParticipants, selectedScheduleIndex);

  return {
    dominantScheduleIndex,
    isActiveSelected: false,
    isException: false,
    kind: 'excluded',
    participatingScheduleIndices: excludedParticipants,
    ymd,
  };
}

/** BCP 47 tag for calendar layout and weekday order — uses the browser locale so en-GB vs en-US week-start is preserved. */
export function resolveCalendarLocale(browserLanguage: string): string {
  if (browserLanguage.length === 0) {
    return fallbackCalendarLocale;
  }

  return browserLanguage;
}

export function resolveLocaleFirstDayOfWeek(locale: string): number {
  try {
    const intlLocale = new Intl.Locale(locale);

    if (isIntlLocaleWithWeekInfo(intlLocale)) {
      const weekInfo = typeof intlLocale.getWeekInfo === 'function' ? intlLocale.getWeekInfo() : intlLocale.weekInfo;
      const firstDay = weekInfo?.firstDay;

      if (firstDay !== undefined && firstDay >= 1 && firstDay <= daysInWeek) {
        return firstDay;
      }
    }
  } catch {
    // Invalid BCP 47 tag — fall back to Monday.
  }

  return defaultLocaleFirstDay;
}

/** Maps Intl `firstDay` (1 = Monday … 7 = Sunday) to `Date#getUTCDay()` (0 = Sunday … 6 = Saturday). */
function resolveWeekStartUtcDay(firstDay: number): number {
  return firstDay % daysInWeek;
}

function positiveModule(value: number, module: number): number {
  return ((value % module) + module) % module;
}

function resolveLeadingPaddingForMonth(month: string, firstDay: number): number {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstOfMonthUtcDay = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const weekStartUtcDay = resolveWeekStartUtcDay(firstDay);

  return positiveModule(firstOfMonthUtcDay - weekStartUtcDay, daysInWeek);
}

/** Display order only: `quickSetupWeekdays` stays Monday-first because it also drives the submit payload order. */
export function localeOrderedWeekdays(locale: string): readonly ScheduleWeekDay[] {
  const offset = resolveLocaleFirstDayOfWeek(locale) - 1;

  return Array.from({ length: daysInWeek }, (_ignored, index) => quickSetupWeekdays[(offset + index) % daysInWeek]);
}

export function localeWeekdayLabels(locale: string): readonly string[] {
  const firstDay = resolveLocaleFirstDayOfWeek(locale);
  const anchorOffsetDays = firstDay % daysInWeek;
  const anchorUtc = aSundayUtc + anchorOffsetDays * millisecondsPerDay;
  const formatter = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'narrow' });

  return Array.from({ length: daysInWeek }, (_ignored, index) => {
    const label = formatter.format(new Date(anchorUtc + index * millisecondsPerDay));

    return label.charAt(0).toUpperCase();
  });
}

export function formatMonthTitle(month: string, locale: string): string {
  const [year, monthNumber] = month.split('-').map(Number);

  return new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC', year: 'numeric' }).format(Date.UTC(year, monthNumber - 1, 1));
}

function countDaysInMonth(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number);

  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function addMonthsToMonthKey(monthKey: string, monthsToAdd: number): string {
  const [year, monthNumber] = monthKey.split('-').map(Number);
  const nextMonth = new Date(year, monthNumber - 1 + monthsToAdd, 1);

  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function buildQuickSetupCalendarPreviewMonthKeys(timezone: string, anchorYmd?: string): readonly string[] {
  const startYmd = anchorYmd ?? getQuickSetupMinAllowedDateForTimezone(timezone);
  const endYmd = anchorYmd
    ? moment.tz(anchorYmd, timezone).add(quickSetupScheduleMaxMonthsAhead, 'months').format('YYYY-MM-DD')
    : getQuickSetupMaxAllowedDateForTimezone(timezone);
  const startMonthKey = startYmd.slice(0, monthKeyLength);
  const endMonthKey = endYmd.slice(0, monthKeyLength);
  const monthKeys: string[] = [];

  for (let currentMonthKey = startMonthKey; currentMonthKey <= endMonthKey; currentMonthKey = addMonthsToMonthKey(currentMonthKey, 1)) {
    monthKeys.push(currentMonthKey);
  }

  return monthKeys;
}

function buildDayCellsForMonth(month: string): ScheduleCalendarMonthCell[] {
  const totalDays = countDaysInMonth(month);

  return Array.from({ length: totalDays }, (_ignored, dayIndex): ScheduleCalendarMonthCell => {
    const day = dayIndex + 1;
    const ymd = `${month}-${String(day).padStart(2, '0')}`;

    return {
      dayNumber: day,
      mark: null,
      ymd,
    };
  });
}

export function filterDayCellsForMonth(
  month: string,
  dayCells: readonly ScheduleCalendarMonthCell[],
): readonly ScheduleCalendarMonthCell[] {
  return dayCells.filter(cell => cell.ymd?.slice(0, monthKeyLength) === month);
}

export function buildMonthWeeks(month: string, locale: string, dayCells: readonly ScheduleCalendarMonthCell[]): ScheduleCalendarMonthWeeks {
  const firstDay = resolveLocaleFirstDayOfWeek(locale);
  const leadingPadding = resolveLeadingPaddingForMonth(month, firstDay);
  const totalDays = dayCells.length;
  const trailingPadding = (daysInWeek - ((leadingPadding + totalDays) % daysInWeek)) % daysInWeek;
  const cells: (ScheduleCalendarMonthCell | null)[] = [
    ...Array.from({ length: leadingPadding }, (): null => null),
    ...dayCells,
    ...Array.from({ length: trailingPadding }, (): null => null),
  ];

  return Array.from({ length: cells.length / daysInWeek }, (_ignored, weekIndex) =>
    cells.slice(weekIndex * daysInWeek, weekIndex * daysInWeek + daysInWeek),
  );
}

function collectVisibleScheduleYmds(snapshots: readonly ScheduleDaysSnapshot[]): Set<string> {
  const visibleYmds = new Set<string>();

  snapshots.forEach(snapshot => {
    for (const ymd of snapshot.activeDays) {
      visibleYmds.add(ymd);
    }

    for (const ymd of snapshot.excludedDays) {
      visibleYmds.add(ymd);
    }
  });

  return visibleYmds;
}

function collectMonthDayCellsByVisibleScheduleDays(
  snapshots: readonly ScheduleCalendarSnapshot[],
  selectedScheduleIndex: number,
): Map<string, ScheduleCalendarMonthCell[]> {
  const monthDayCells = new Map<string, ScheduleCalendarMonthCell[]>();

  for (const ymd of collectVisibleScheduleYmds(snapshots)) {
    const month = ymd.slice(0, monthKeyLength);
    let dayCells = monthDayCells.get(month);

    if (!dayCells) {
      dayCells = buildDayCellsForMonth(month);
      monthDayCells.set(month, dayCells);
    }

    const mark = resolveDayMark(ymd, snapshots, selectedScheduleIndex);

    if (!mark) {
      continue;
    }

    const dayNumber = Number(ymd.slice(8, 10));
    const dayCell = dayCells[dayNumber - 1];

    if (dayCell?.ymd === ymd) {
      dayCell.mark = mark;
    }
  }

  return monthDayCells;
}

export function buildScheduleCalendarViewVm(
  schedules: readonly ScheduleCalendarViewScheduleInput[],
  selectedScheduleIndex: number,
  timezone = 'UTC',
): ScheduleCalendarViewVm {
  const snapshots = schedules.map(({ activeDays, exceptionDays, excludedDays, scheduleIndex }) => ({
    activeDays,
    exceptionDays,
    excludedDays,
    scheduleIndex,
  }));
  const monthDayCells = collectMonthDayCellsByVisibleScheduleDays(snapshots, selectedScheduleIndex);
  const previewMonthKeys = buildQuickSetupCalendarPreviewMonthKeys(timezone);
  const months = previewMonthKeys.map(month => {
    const dayCells = monthDayCells.get(month) ?? buildDayCellsForMonth(month);

    return { dayCells, month };
  });
  const todayMonthKey = getQuickSetupMinAllowedDateForTimezone(timezone).slice(0, monthKeyLength);
  const todayMonth = previewMonthKeys.includes(todayMonthKey) ? todayMonthKey : null;

  const schedulePills: ScheduleCalendarViewSchedulePill[] = schedules.map(schedule => ({
    colorKey: getQuickSetupScheduleColorKey(schedule.scheduleIndex),
    id: String(schedule.scheduleIndex),
    name: schedule.name,
    scheduleIndex: schedule.scheduleIndex,
  }));

  return {
    months,
    schedulePills,
    todayMonth,
  };
}
