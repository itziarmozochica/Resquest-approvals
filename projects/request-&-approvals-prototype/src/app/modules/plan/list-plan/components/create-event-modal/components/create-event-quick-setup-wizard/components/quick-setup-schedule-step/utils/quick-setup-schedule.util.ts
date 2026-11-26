import { resolveDefaultOpenTierId } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-calendar-form/utils/schedule-calendar-default-tier.util';
import {
  CalendarDateFrequency,
  CalendarTimeSlotFrequency,
  ScheduleCalendar,
  ScheduleCalendarDateRangeValue,
  ScheduleDay,
  ScheduleTimeSlot,
  ScheduleWeekDay,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import {
  CLOSED_TIER_COLOR,
  GenericOption,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-options.models';
import { sortDateRanges } from '@fz-original/app/modules/inventory/inventory-schedule/utils/schedule-calendar-date-range.util';
import { CapacityTemplate } from '@fz-original/app/modules/inventory/shared/models/capacity-template.model';
import {
  DEFAULT_QUICK_SETUP_CALENDAR_NAME,
  DEFAULT_QUICK_SETUP_START_TIME,
  QuickSetupDayExceptionSubmitValue,
  QuickSetupScheduleBuildParams,
  QuickSetupScheduleFormValue,
  QuickSetupScheduleTierIds,
  quickSetupWeekdays,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';

import { toQuickSetupSalesActivationConfig } from './quick-setup-sales-activation.util';
import { isDateWithinAnyQuickSetupDateRange, resolveFilledQuickSetupDateRanges } from './quick-setup-schedule-date-range.util';

const PLAN_DATE_FORMAT_LENGTH = 10;

export const toLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const calculateDurationInMinutes = (startTime: string, endTime: string): number | null => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
    return null;
  }

  return endMinutes - startMinutes;
};

export const timeToMinutes = (time: string): number => {
  const [hoursPart, minutesPart] = time.split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.NaN;
  }

  return hours * 60 + minutes;
};

export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const expandTimeRange = (firstTime: string, lastTime: string, frequencyMinutes: number): string[] => {
  if (frequencyMinutes <= 0) {
    return [];
  }

  const startMinutes = timeToMinutes(firstTime);
  const endMinutes = timeToMinutes(lastTime);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || startMinutes > endMinutes) {
    return [];
  }

  const times: string[] = [];

  for (let current = startMinutes; current <= endMinutes; current += frequencyMinutes) {
    times.push(minutesToTime(current));
  }

  return times;
};

export const isDateWithinRange = (date: string, startDate: string, endDate: string): boolean => {
  if (!date || !startDate || !endDate) {
    return false;
  }

  return date >= startDate && date <= endDate;
};

export const resolveClosedTierId = (tierOptions: GenericOption[]): number | null => {
  const closedTier = tierOptions.find(
    option => typeof option.id === 'number' && option.color?.toLowerCase() === CLOSED_TIER_COLOR.toLowerCase(),
  );

  if (closedTier && typeof closedTier.id === 'number') {
    return closedTier.id;
  }

  const closedByTitle = tierOptions.find(option => typeof option.id === 'number' && option.title.toLowerCase() === 'closed');

  return closedByTitle && typeof closedByTitle.id === 'number' ? closedByTitle.id : null;
};

export const resolveQuickSetupTierIds = (tierOptions: GenericOption[]): QuickSetupScheduleTierIds => ({
  closedTierId: resolveClosedTierId(tierOptions),
  normalTierId: resolveDefaultOpenTierId(tierOptions),
});

export const resolveVisibleSessionTypeIds = (templateSessionTypeIds: number[], sessionTypeOptions: GenericOption[]): number[] => {
  const templateSessionTypeIdSet = new Set(templateSessionTypeIds);

  return sessionTypeOptions
    .filter(option => typeof option.id === 'number' && templateSessionTypeIdSet.has(option.id))
    .map(option => option.id as number);
};

export const extractCapacityTemplateContext = (templates: CapacityTemplate[]): { capacityTemplateId: string; sessionTypeIds: number[] } => {
  const defaultTemplate = templates.find(template => template.isDefault) ?? templates[0];

  if (!defaultTemplate?.id) {
    return { capacityTemplateId: '', sessionTypeIds: [] };
  }

  const sessionTypeIds = defaultTemplate.groups.flatMap(group => group.sessionTypes.map(sessionType => sessionType.sessionTypeId));

  return {
    capacityTemplateId: defaultTemplate.id,
    sessionTypeIds: [...new Set(sessionTypeIds)],
  };
};

const createLocalId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `local-${Math.random().toString(36).slice(2)}`;
};

const createTimeSlot = (time: string, tierId: number | null, isVisible = true): ScheduleTimeSlot => ({
  disabled: false,
  isVisible,
  overwrittenCapacityTemplateId: null,
  tierId,
  time,
});

const createScheduleDay = (
  specificDate: string | null,
  weekDayName: ScheduleWeekDay | null,
  timeSlots: ScheduleTimeSlot[],
): ScheduleDay => ({
  specificDate,
  timeSlots,
  weekDayName,
});

const buildEmptyWeekdayFields = (): Pick<
  ScheduleCalendar,
  'friday' | 'monday' | 'saturday' | 'sunday' | 'thursday' | 'tuesday' | 'wednesday'
> => ({
  friday: null,
  monday: null,
  saturday: null,
  sunday: null,
  thursday: null,
  tuesday: null,
  wednesday: null,
});

const buildWeekdayScheduleDays = (
  selectedWeekdays: ScheduleWeekDay[],
  timeSlots: ScheduleTimeSlot[],
): Pick<ScheduleCalendar, 'friday' | 'monday' | 'saturday' | 'sunday' | 'thursday' | 'tuesday' | 'wednesday'> => {
  const selectedSet = new Set(selectedWeekdays);

  return {
    friday: selectedSet.has(ScheduleWeekDay.Friday) ? createScheduleDay(null, ScheduleWeekDay.Friday, timeSlots) : null,
    monday: selectedSet.has(ScheduleWeekDay.Monday) ? createScheduleDay(null, ScheduleWeekDay.Monday, timeSlots) : null,
    saturday: selectedSet.has(ScheduleWeekDay.Saturday) ? createScheduleDay(null, ScheduleWeekDay.Saturday, timeSlots) : null,
    sunday: selectedSet.has(ScheduleWeekDay.Sunday) ? createScheduleDay(null, ScheduleWeekDay.Sunday, timeSlots) : null,
    thursday: selectedSet.has(ScheduleWeekDay.Thursday) ? createScheduleDay(null, ScheduleWeekDay.Thursday, timeSlots) : null,
    tuesday: selectedSet.has(ScheduleWeekDay.Tuesday) ? createScheduleDay(null, ScheduleWeekDay.Tuesday, timeSlots) : null,
    wednesday: selectedSet.has(ScheduleWeekDay.Wednesday) ? createScheduleDay(null, ScheduleWeekDay.Wednesday, timeSlots) : null,
  };
};

const buildSpecificDaysFromDates = (dates: string[], timeSlots: ScheduleTimeSlot[]): ScheduleDay[] =>
  dates.filter(date => date.length === PLAN_DATE_FORMAT_LENGTH).map(date => createScheduleDay(date, null, timeSlots));

const resolveSingleTimeSlotTimes = (formValue: QuickSetupScheduleBuildParams['formValue']): string[] =>
  formValue.singleTimeSlots.map(row => row.startTime).filter(Boolean);

const resolveRecurringTimeSlotTimes = (formValue: QuickSetupScheduleBuildParams['formValue']): string[] => {
  const frequency = Number(formValue.repeatsEveryMinutes ?? 0);

  if (!Number.isFinite(frequency) || frequency <= 0) {
    return [];
  }

  if (formValue.recurringRanges.length === 1) {
    const range = formValue.recurringRanges[0];
    return expandTimeRange(range.firstTime, range.lastTime, frequency);
  }

  return formValue.recurringRanges.flatMap(range => expandTimeRange(range.firstTime, range.lastTime, frequency));
};

const buildClosedTimeSlotsFromOpen = (openTimeSlots: ScheduleTimeSlot[]): ScheduleTimeSlot[] =>
  openTimeSlots.map(slot => createTimeSlot(slot.time, null, false));

interface QuickSetupMainTimeSlotConfig {
  endTime: string | null;
  specificTimeSlots: string[];
  startTime: string | null;
  timeFrequencyInMinutes: number | null;
  timeSlotFrequency: CalendarTimeSlotFrequency;
}

const buildExceptionCalendar = (
  date: string,
  capacityTemplateId: string,
  sessionTypeIds: number[],
  mainTimeSlotConfig: QuickSetupMainTimeSlotConfig,
  timeSlots: ScheduleTimeSlot[],
  durationInMinutes: number,
): ScheduleCalendar => ({
  capacityTemplateId,
  dateFrequency: CalendarDateFrequency.SingleDates,
  dateRanges: [],
  durationInMinutes,
  endDateConstraint: null,
  endTime: mainTimeSlotConfig.endTime,
  exceptionCalendars: [],
  ...buildEmptyWeekdayFields(),
  id: null,
  localId: createLocalId(),
  name: DEFAULT_QUICK_SETUP_CALENDAR_NAME,
  salesActivationConfig: null,
  sessionTypeIds,
  specificDays: [createScheduleDay(date, null, timeSlots)],
  specificTimeSlots: [...mainTimeSlotConfig.specificTimeSlots],
  startDateConstraint: null,
  startTime: mainTimeSlotConfig.startTime,
  status: null,
  timeFrequencyInMinutes: mainTimeSlotConfig.timeFrequencyInMinutes,
  timeSlotFrequency: mainTimeSlotConfig.timeSlotFrequency,
});

const buildExcludedExceptionCalendars = (
  params: QuickSetupScheduleBuildParams,
  mainTimeSlotConfig: QuickSetupMainTimeSlotConfig,
  closedTimeSlots: ScheduleTimeSlot[],
): ScheduleCalendar[] => {
  const { capacityTemplateId, formValue, sessionTypeIds } = params;

  if (formValue.dateFrequency !== CalendarDateFrequency.RecurrentDates) {
    return [];
  }

  const recurrentDateRanges = resolveFilledQuickSetupDateRanges(formValue.dateRanges);

  return formValue.excludedDates
    .filter(date => isDateWithinAnyQuickSetupDateRange(date, recurrentDateRanges))
    .map(date =>
      buildExceptionCalendar(date, capacityTemplateId, sessionTypeIds, mainTimeSlotConfig, closedTimeSlots, formValue.durationInMinutes),
    );
};

const resolveDayExceptionSpecificDays = (
  exception: QuickSetupDayExceptionSubmitValue,
  openTimeSlots: ScheduleTimeSlot[],
): ScheduleDay[] => {
  const calendarDaysByDate = new Map(
    exception.calendarDays.filter(day => day.specificDate !== null).map(day => [day.specificDate as string, day]),
  );

  return exception.dates
    .filter(date => date.length === PLAN_DATE_FORMAT_LENGTH)
    .map(date => calendarDaysByDate.get(date) ?? createScheduleDay(date, null, openTimeSlots));
};

const buildDayExceptionCalendar = (
  exception: QuickSetupDayExceptionSubmitValue,
  capacityTemplateId: string,
  mainTimeSlotConfig: QuickSetupMainTimeSlotConfig,
  openTimeSlots: ScheduleTimeSlot[],
  durationInMinutes: number,
): ScheduleCalendar => ({
  capacityTemplateId,
  dateFrequency: CalendarDateFrequency.SingleDates,
  dateRanges: [],
  durationInMinutes,
  endDateConstraint: null,
  endTime: mainTimeSlotConfig.endTime,
  exceptionCalendars: [],
  ...buildEmptyWeekdayFields(),
  id: null,
  localId: createLocalId(),
  name: DEFAULT_QUICK_SETUP_CALENDAR_NAME,
  salesActivationConfig: null,
  sessionTypeIds: exception.selectedSessionTypeIds,
  specificDays: resolveDayExceptionSpecificDays(exception, openTimeSlots),
  specificTimeSlots: [...mainTimeSlotConfig.specificTimeSlots],
  startDateConstraint: null,
  startTime: mainTimeSlotConfig.startTime,
  status: null,
  timeFrequencyInMinutes: mainTimeSlotConfig.timeFrequencyInMinutes,
  timeSlotFrequency: mainTimeSlotConfig.timeSlotFrequency,
});

const buildDayExceptionCalendars = (
  params: QuickSetupScheduleBuildParams,
  mainTimeSlotConfig: QuickSetupMainTimeSlotConfig,
  openTimeSlots: ScheduleTimeSlot[],
): ScheduleCalendar[] => {
  const { capacityTemplateId, dayExceptions = [], formValue } = params;

  if (formValue.dateFrequency !== CalendarDateFrequency.RecurrentDates) {
    return [];
  }

  return dayExceptions
    .filter(exception => exception.dates.length > 0)
    .map(exception =>
      buildDayExceptionCalendar(exception, capacityTemplateId, mainTimeSlotConfig, openTimeSlots, formValue.durationInMinutes),
    );
};

const buildExceptionCalendars = (
  params: QuickSetupScheduleBuildParams,
  mainTimeSlotConfig: QuickSetupMainTimeSlotConfig,
  closedTimeSlots: ScheduleTimeSlot[],
  openTimeSlots: ScheduleTimeSlot[],
): ScheduleCalendar[] => [
  ...buildExcludedExceptionCalendars(params, mainTimeSlotConfig, closedTimeSlots),
  ...buildDayExceptionCalendars(params, mainTimeSlotConfig, openTimeSlots),
];

export const buildQuickSetupExceptionCalendarDays = (dates: string[], timeLabels: string[], normalTierId: number | null): ScheduleDay[] =>
  buildSpecificDaysFromDates(
    dates,
    timeLabels.map(time => createTimeSlot(time, normalTierId)),
  );

export const buildQuickSetupExceptionStructureKey = (
  exceptionKey: string,
  dates: string[],
  formValue: QuickSetupScheduleFormValue,
  isAssigningTiers: boolean,
  normalTierId: number | null,
): string => {
  const structureKey = [
    formValue.timeSlotFrequency,
    dates.join(','),
    formValue.singleTimeSlots.map(row => row.startTime).join(','),
    formValue.recurringRanges.map(range => `${range.firstTime}-${range.lastTime}`).join(','),
    String(formValue.repeatsEveryMinutes),
  ].join('|');

  if (!isAssigningTiers) {
    return `${exceptionKey}|${structureKey}`;
  }

  return `${exceptionKey}|${structureKey}|open-tier:${normalTierId ?? 'none'}`;
};

export interface SyncQuickSetupExceptionCalendarDaysParams {
  calendarDays: ScheduleDay[];
  dates: string[];
  exceptionKey: string;
  formValue: QuickSetupScheduleFormValue;
  isAssigningTiers: boolean;
  normalTierId: number;
  previousTimeLabels: string[];
  structureKey: string;
  timeLabels: string[];
}

export interface SyncQuickSetupExceptionCalendarDaysResult {
  calendarDays: ScheduleDay[];
  changed: boolean;
  previousTimeLabels: string[];
  structureKey: string;
}

export const syncQuickSetupExceptionCalendarDays = (
  params: SyncQuickSetupExceptionCalendarDaysParams,
): SyncQuickSetupExceptionCalendarDaysResult => {
  const { calendarDays, dates, exceptionKey, formValue, isAssigningTiers, normalTierId, previousTimeLabels, structureKey, timeLabels } =
    params;

  if (dates.length === 0 || timeLabels.length === 0) {
    if (calendarDays.length > 0 || structureKey !== '') {
      return {
        calendarDays: [],
        changed: true,
        previousTimeLabels: [],
        structureKey: '',
      };
    }

    return {
      calendarDays,
      changed: false,
      previousTimeLabels,
      structureKey,
    };
  }

  const nextStructureKey = buildQuickSetupExceptionStructureKey(exceptionKey, dates, formValue, isAssigningTiers, normalTierId);

  if (nextStructureKey === structureKey) {
    return {
      calendarDays,
      changed: false,
      previousTimeLabels,
      structureKey,
    };
  }

  const seededDays = buildQuickSetupExceptionCalendarDays(dates, timeLabels, normalTierId);

  return {
    calendarDays: mergeQuickSetupCalendarDays(calendarDays, seededDays, previousTimeLabels),
    changed: true,
    previousTimeLabels: timeLabels,
    structureKey: nextStructureKey,
  };
};

export const buildQuickSetupScheduleCalendar = (params: QuickSetupScheduleBuildParams): ScheduleCalendar => {
  const { capacityTemplateId, formValue, sessionTypeIds, tierIds, timezone } = params;
  const salesActivationConfig = toQuickSetupSalesActivationConfig(formValue.salesActivation, timezone);
  const isRecurrentDates = formValue.dateFrequency === CalendarDateFrequency.RecurrentDates;
  const isRecurrentTimeSlots = formValue.timeSlotFrequency === CalendarTimeSlotFrequency.RecurrentTimeSlots;
  const openTierId = tierIds.normalTierId;
  const timeLabels = isRecurrentTimeSlots ? resolveRecurringTimeSlotTimes(formValue) : resolveSingleTimeSlotTimes(formValue);
  const openTimeSlots = timeLabels.map(time => createTimeSlot(time, openTierId));

  let startTime: string | null = null;
  let endTime: string | null = null;
  let timeFrequencyInMinutes: number | null = null;
  let specificTimeSlots: string[] = [];

  if (isRecurrentTimeSlots) {
    const repeatsEveryMinutes = Number(formValue.repeatsEveryMinutes ?? 0);

    if (formValue.recurringRanges.length === 1) {
      const range = formValue.recurringRanges[0];
      startTime = range.firstTime || null;
      endTime = range.lastTime || null;
      timeFrequencyInMinutes = Number.isFinite(repeatsEveryMinutes) && repeatsEveryMinutes > 0 ? repeatsEveryMinutes : null;
    } else {
      specificTimeSlots = timeLabels;
    }
  } else {
    specificTimeSlots = timeLabels;
  }

  const weekdayFields = isRecurrentDates ? buildWeekdayScheduleDays(formValue.selectedWeekdays, openTimeSlots) : buildEmptyWeekdayFields();

  const specificDays = isRecurrentDates ? [] : buildSpecificDaysFromDates(formValue.specificDates, openTimeSlots);

  const mainTimeSlotConfig: QuickSetupMainTimeSlotConfig = {
    endTime,
    specificTimeSlots,
    startTime,
    timeFrequencyInMinutes,
    timeSlotFrequency: formValue.timeSlotFrequency,
  };
  const closedTimeSlots =
    openTimeSlots.length > 0 ? buildClosedTimeSlotsFromOpen(openTimeSlots) : [createTimeSlot(DEFAULT_QUICK_SETUP_START_TIME, null, false)];

  let dateRanges: ScheduleCalendarDateRangeValue[] = [];

  if (isRecurrentDates) {
    dateRanges = sortDateRanges(resolveFilledQuickSetupDateRanges(formValue.dateRanges)).map(
      (dateRange): ScheduleCalendarDateRangeValue => ({
        endDate: dateRange.endDate,
        id: null,
        startDate: dateRange.startDate,
      }),
    );
  }

  return {
    capacityTemplateId,
    dateFrequency: formValue.dateFrequency,
    dateRanges,
    durationInMinutes: formValue.durationInMinutes,
    endDateConstraint: null,
    endTime,
    exceptionCalendars: buildExceptionCalendars(params, mainTimeSlotConfig, closedTimeSlots, openTimeSlots),
    friday: weekdayFields.friday,
    id: null,
    localId: createLocalId(),
    monday: weekdayFields.monday,
    name: formValue.name,
    salesActivationConfig,
    saturday: weekdayFields.saturday,
    sessionTypeIds,
    specificDays,
    specificTimeSlots,
    startDateConstraint: null,
    startTime,
    status: null,
    sunday: weekdayFields.sunday,
    thursday: weekdayFields.thursday,
    timeFrequencyInMinutes,
    timeSlotFrequency: formValue.timeSlotFrequency,
    tuesday: weekdayFields.tuesday,
    wednesday: weekdayFields.wednesday,
  };
};

export const resolveQuickSetupTimeLabels = (formValue: QuickSetupScheduleBuildParams['formValue']): string[] => {
  if (formValue.timeSlotFrequency === CalendarTimeSlotFrequency.RecurrentTimeSlots) {
    return resolveRecurringTimeSlotTimes(formValue);
  }

  return resolveSingleTimeSlotTimes(formValue);
};

export const calendarToQuickSetupDays = (calendar: ScheduleCalendar): ScheduleDay[] => {
  if (calendar.dateFrequency === CalendarDateFrequency.RecurrentDates) {
    return quickSetupWeekdays.map(weekday => calendar[weekday]).filter((day): day is ScheduleDay => day !== null);
  }

  return [...calendar.specificDays];
};

const weekdayFieldsFromDays = (
  days: ScheduleDay[],
): Pick<ScheduleCalendar, 'friday' | 'monday' | 'saturday' | 'sunday' | 'thursday' | 'tuesday' | 'wednesday'> => {
  const daysByWeekday = new Map<ScheduleWeekDay, ScheduleDay>();

  for (const day of days) {
    if (day.weekDayName !== null) {
      daysByWeekday.set(day.weekDayName, day);
    }
  }

  return {
    friday: daysByWeekday.get(ScheduleWeekDay.Friday) ?? null,
    monday: daysByWeekday.get(ScheduleWeekDay.Monday) ?? null,
    saturday: daysByWeekday.get(ScheduleWeekDay.Saturday) ?? null,
    sunday: daysByWeekday.get(ScheduleWeekDay.Sunday) ?? null,
    thursday: daysByWeekday.get(ScheduleWeekDay.Thursday) ?? null,
    tuesday: daysByWeekday.get(ScheduleWeekDay.Tuesday) ?? null,
    wednesday: daysByWeekday.get(ScheduleWeekDay.Wednesday) ?? null,
  };
};

export const applyQuickSetupCalendarDays = (calendar: ScheduleCalendar, days: ScheduleDay[]): ScheduleCalendar => {
  if (calendar.dateFrequency === CalendarDateFrequency.RecurrentDates) {
    return {
      ...calendar,
      ...weekdayFieldsFromDays(days),
    };
  }

  return {
    ...calendar,
    specificDays: days.filter(day => day.specificDate !== null),
  };
};

const quickSetupDayKey = (day: ScheduleDay): string => day.weekDayName ?? day.specificDate ?? '';

export const mergeQuickSetupCalendarDays = (
  previousDays: ScheduleDay[],
  nextDays: ScheduleDay[],
  previousTimeLabels: string[],
): ScheduleDay[] => {
  const previousDaysByKey = new Map(previousDays.map(day => [quickSetupDayKey(day), day]));
  const previousTimeSet = new Set(previousTimeLabels);

  return nextDays.map(nextDay => {
    const previousDay = previousDaysByKey.get(quickSetupDayKey(nextDay));

    if (previousDay === undefined) {
      return nextDay;
    }

    const previousSlotsByTime = new Map(previousDay.timeSlots.map(slot => [slot.time, slot]));

    return {
      ...nextDay,
      timeSlots: nextDay.timeSlots.flatMap(slot => {
        const previousSlot = previousSlotsByTime.get(slot.time);

        if (previousSlot !== undefined) {
          return [{ ...slot, isVisible: previousSlot.isVisible, tierId: previousSlot.tierId }];
        }

        if (previousTimeSet.has(slot.time)) {
          return [];
        }

        return [slot];
      }),
    };
  });
};

export const applyTierToQuickSetupDay = (day: ScheduleDay, times: string[], tierId: number | null): ScheduleDay => {
  const timesSet = new Set(times);

  if (tierId === null) {
    return {
      ...day,
      timeSlots: day.timeSlots.filter(slot => slot.disabled || !timesSet.has(slot.time)),
    };
  }

  const existingTimes = new Set(day.timeSlots.map(slot => slot.time));
  const updatedSlots: ScheduleTimeSlot[] = day.timeSlots.map(slot => {
    if (timesSet.has(slot.time) && !slot.disabled) {
      return { ...slot, tierId };
    }

    return slot;
  });
  const addedSlots = times.filter(time => !existingTimes.has(time)).map(time => createTimeSlot(time, tierId));

  return { ...day, timeSlots: [...updatedSlots, ...addedSlots] };
};
