import { FormArray, FormControl, FormGroup } from '@angular/forms';

import {
  CalendarDateFrequency,
  CalendarSalesActivationDeltaReference,
  CalendarSalesActivationTimeUnit,
  CalendarSalesActivationType,
  CalendarTimeSlotFrequency,
  ScheduleDay,
  ScheduleWeekDay,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

export interface QuickSetupDateRowViewModel {
  control: FormControl<string>;
  index: number;
  rowKey: string;
}

export interface QuickSetupRecurrentDateRangeRow {
  endDate: string;
  startDate: string;
}

export type QuickSetupDateRangeFormGroup = FormGroup<{ endDate: FormControl<string>; startDate: FormControl<string> }>;

export type QuickSetupDateRangesFormArray = FormArray<QuickSetupDateRangeFormGroup>;

export interface QuickSetupDateRangeRowViewModel {
  endDateControl: FormControl<string>;
  index: number;
  key: string;
  startDateControl: FormControl<string>;
}

export interface QuickSetupRecurringRangeRowViewModel {
  firstTimeControl: FormControl<string>;
  index: number;
  key: string;
  lastTimeControl: FormControl<string>;
}

export interface QuickSetupSingleTimeSlotRowViewModel {
  endTimeControl: FormControl<string>;
  index: number;
  key: string;
  startTimeControl: FormControl<string>;
}

export interface QuickSetupWeekdayViewModel {
  isOutOfRange: boolean;
  isSelected: boolean;
  labelKey: string;
  weekday: ScheduleWeekDay;
}

export interface QuickSetupCalendarGridParams {
  endTime: string;
  fixedTimeSlots: string[];
  startTime: string;
  duration?: number;
}

export interface QuickSetupSingleTimeSlotRow {
  endTime: string;
  startTime: string;
}

export interface QuickSetupRecurringTimeRangeRow {
  firstTime: string;
  lastTime: string;
}

export interface QuickSetupDayException {
  dates: string[];
  selectedSessionTypeIds: number[];
}

export interface QuickSetupDayExceptionValue extends QuickSetupDayException {
  calendarDays: ScheduleDay[];
  key: string;
}

export interface QuickSetupDayExceptionSubmitValue extends QuickSetupDayException {
  calendarDays: ScheduleDay[];
}

export interface QuickSetupDayExceptionRowViewModel {
  dateRows: QuickSetupDateRowViewModel[];
  index: number;
  key: string;
  selectedSessionTypeIdsControl: FormControl<number[]>;
}

export interface QuickSetupSalesWindowFormValue {
  delta: number | null;
  deltaReference: CalendarSalesActivationDeltaReference | null;
  deltaTimeUnit: CalendarSalesActivationTimeUnit | null;
  fixedDateTime: string;
  type: CalendarSalesActivationType;
}

export interface QuickSetupSalesActivationFormValue {
  end: QuickSetupSalesWindowFormValue;
  start: QuickSetupSalesWindowFormValue;
}

export type QuickSetupSalesWindowFormGroup = FormGroup<{
  delta: FormControl<number | null>;
  deltaReference: FormControl<CalendarSalesActivationDeltaReference | null>;
  deltaTimeUnit: FormControl<CalendarSalesActivationTimeUnit | null>;
  fixedDateTime: FormControl<string>;
  type: FormControl<CalendarSalesActivationType>;
}>;

export type QuickSetupSalesActivationFormGroup = FormGroup<{
  end: QuickSetupSalesWindowFormGroup;
  start: QuickSetupSalesWindowFormGroup;
}>;

export interface QuickSetupSalesWindowViewModel {
  isFixedDate: boolean;
  isRelative: boolean;
  selectedDeltaReferenceOption: SelectOption | undefined;
  selectedTimeUnitOption: SelectOption | undefined;
}

export interface QuickSetupSalesActivationRelativeDefault {
  delta: number;
  reference: CalendarSalesActivationDeltaReference;
  timeUnit: CalendarSalesActivationTimeUnit;
}

export interface QuickSetupScheduleFormValue {
  dateFrequency: CalendarDateFrequency;
  dateRanges: QuickSetupRecurrentDateRangeRow[];
  dayExceptions: QuickSetupDayException[];
  durationInMinutes: number;
  excludedDates: string[];
  name: string;
  recurringRanges: QuickSetupRecurringTimeRangeRow[];
  repeatsEveryMinutes: number | null;
  salesActivation: QuickSetupSalesActivationFormValue;
  selectedSessionTypeIds: number[];
  selectedWeekdays: ScheduleWeekDay[];
  singleTimeSlots: QuickSetupSingleTimeSlotRow[];
  specificDates: string[];
  timeSlotFrequency: CalendarTimeSlotFrequency;
}

export type QuickSetupScheduleFormPatchValue = Partial<QuickSetupScheduleFormValue>;

export interface QuickSetupScheduleStepFormValue {
  schedules: QuickSetupScheduleFormValue[];
}

export interface QuickSetupScheduleTierIds {
  closedTierId: number | null;
  normalTierId: number | null;
}

export interface QuickSetupScheduleBuildParams {
  capacityTemplateId: string;
  formValue: QuickSetupScheduleFormValue;
  sessionTypeIds: number[];
  tierIds: QuickSetupScheduleTierIds;
  timezone: string;
  dayExceptions?: QuickSetupDayExceptionSubmitValue[];
}

export const DEFAULT_QUICK_SETUP_CALENDAR_NAME = 'Schedule';

export const MAX_QUICK_SETUP_SCHEDULE_COUNT = 50;

export const DEFAULT_QUICK_SETUP_START_TIME = '09:00';

export const DEFAULT_QUICK_SETUP_END_TIME = '11:00';

export const QUICK_SETUP_DEFAULT_TIMEZONE = 'UTC';
export const QUICK_SETUP_SALES_ACTIVATION_DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm';

export const QUICK_SETUP_SALES_ACTIVATION_TRANSLATION_PREFIX = 'inventory.schedule.scheduleForm.fields.salesActivation';

export const QUICK_SETUP_SALES_ACTIVATION_START_TYPES: readonly CalendarSalesActivationType[] = [
  CalendarSalesActivationType.SinceCreation,
  CalendarSalesActivationType.RelativeTo,
  CalendarSalesActivationType.FixedDate,
];

export const QUICK_SETUP_SALES_ACTIVATION_END_TYPES: readonly CalendarSalesActivationType[] = [
  CalendarSalesActivationType.RelativeTo,
  CalendarSalesActivationType.FixedDate,
];

export const QUICK_SETUP_SALES_ACTIVATION_TIME_UNITS: readonly CalendarSalesActivationTimeUnit[] = [
  CalendarSalesActivationTimeUnit.Minutes,
  CalendarSalesActivationTimeUnit.Hours,
  CalendarSalesActivationTimeUnit.Days,
  CalendarSalesActivationTimeUnit.Weeks,
];

export const DEFAULT_QUICK_SETUP_SALES_ACTIVATION_START_RELATIVE: QuickSetupSalesActivationRelativeDefault = {
  delta: 4,
  reference: CalendarSalesActivationDeltaReference.BeforeStartDate,
  timeUnit: CalendarSalesActivationTimeUnit.Weeks,
};

export const DEFAULT_QUICK_SETUP_SALES_ACTIVATION_END_RELATIVE: QuickSetupSalesActivationRelativeDefault = {
  delta: 60,
  reference: CalendarSalesActivationDeltaReference.BeforeStartDate,
  timeUnit: CalendarSalesActivationTimeUnit.Minutes,
};

export const DEFAULT_QUICK_SETUP_SALES_ACTIVATION_FORM_VALUE: QuickSetupSalesActivationFormValue = {
  end: {
    delta: DEFAULT_QUICK_SETUP_SALES_ACTIVATION_END_RELATIVE.delta,
    deltaReference: DEFAULT_QUICK_SETUP_SALES_ACTIVATION_END_RELATIVE.reference,
    deltaTimeUnit: DEFAULT_QUICK_SETUP_SALES_ACTIVATION_END_RELATIVE.timeUnit,
    fixedDateTime: '',
    type: CalendarSalesActivationType.RelativeTo,
  },
  start: {
    delta: null,
    deltaReference: null,
    deltaTimeUnit: null,
    fixedDateTime: '',
    type: CalendarSalesActivationType.SinceCreation,
  },
};

export const quickSetupWeekdays: ScheduleWeekDay[] = [
  ScheduleWeekDay.Monday,
  ScheduleWeekDay.Tuesday,
  ScheduleWeekDay.Wednesday,
  ScheduleWeekDay.Thursday,
  ScheduleWeekDay.Friday,
  ScheduleWeekDay.Saturday,
  ScheduleWeekDay.Sunday,
];

export const DEFAULT_QUICK_SETUP_SELECTED_WEEKDAYS: ScheduleWeekDay[] = [];
