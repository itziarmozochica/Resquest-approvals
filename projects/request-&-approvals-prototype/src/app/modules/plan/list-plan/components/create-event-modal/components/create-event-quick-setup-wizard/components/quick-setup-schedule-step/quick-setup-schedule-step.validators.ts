import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import { parsePlanDate } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-calendar-form/utils/schedule-calendar-date.util';
import {
  CalendarDateFrequency,
  CalendarSalesActivationType,
  ScheduleWeekDay,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { getWeekDaysInDateRanges } from '@fz-original/app/modules/inventory/inventory-schedule/utils/schedule-calendar-date-range.util';
import { QuickSetupDayExceptionValue } from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import moment from 'moment-timezone';

import { parseQuickSetupNullableNumber, parseQuickSetupSalesActivationDateTime } from './utils/quick-setup-sales-activation.util';
import {
  isDateWithinAnyQuickSetupDateRange,
  readQuickSetupDateRangesFromForm,
  resolveFilledQuickSetupDateRanges,
} from './utils/quick-setup-schedule-date-range.util';
import { calculateDurationInMinutes, timeToMinutes } from './utils/quick-setup-schedule.util';

export const quickSetupScheduleMaxMonthsAhead = 12;

export const getQuickSetupMaxAllowedDateForTimezone = (timezone: string): string =>
  moment.tz(timezone).add(quickSetupScheduleMaxMonthsAhead, 'months').format('YYYY-MM-DD');

export const getQuickSetupMinAllowedDateForTimezone = (timezone: string): string => moment.tz(timezone).startOf('day').format('YYYY-MM-DD');

const collectDayExceptionDates = (form: FormGroup): string[] => {
  const dayExceptionsControl = form.get('dayExceptions');

  if (!dayExceptionsControl || dayExceptionsControl.disabled) {
    return [];
  }

  const dayExceptions = (dayExceptionsControl.value ?? []) as QuickSetupDayExceptionValue[];

  return dayExceptions.flatMap(exception => exception.dates.filter(Boolean));
};

const resolveQuickSetupScheduleForm = (control: AbstractControl): FormGroup | null => {
  let current: AbstractControl | null = control.parent;

  while (current !== null) {
    if (current instanceof FormGroup && current.get('dateRanges') !== null) {
      return current;
    }

    current = current.parent;
  }

  return null;
};

export const excludedDateInRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const form = resolveQuickSetupScheduleForm(control);

  if (!form) {
    return null;
  }

  const date = control.value as string;
  const dateRanges = readQuickSetupDateRangesFromForm(form);

  if (!date || resolveFilledQuickSetupDateRanges(dateRanges).length === 0) {
    return null;
  }

  return isDateWithinAnyQuickSetupDateRange(date, dateRanges) ? null : { outOfRange: true };
};

export const excludedDateConflictsWithDayExceptionValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const form = resolveQuickSetupScheduleForm(control);

  if (!form) {
    return null;
  }

  const date = control.value as string;

  if (!date) {
    return null;
  }

  return collectDayExceptionDates(form).includes(date) ? { conflictsWithDayException: true } : null;
};

export function createDateNotBeforeTodayValidator(resolveTimezone?: () => string | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const date = control.value as string;

    if (!date) {
      return null;
    }

    const timezone = resolveTimezone?.() ?? 'UTC';
    const parsedDate = parsePlanDate(date, timezone);

    if (!parsedDate) {
      return null;
    }

    const today = moment.tz(timezone).startOf('day');

    return parsedDate.isBefore(today, 'day') ? { dateNotBeforeToday: true } : null;
  };
}

export function createDateNotAfterMaxAllowedValidator(resolveTimezone?: () => string | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const date = control.value as string;

    if (!date) {
      return null;
    }

    const timezone = resolveTimezone?.() ?? 'UTC';
    const parsedDate = parsePlanDate(date, timezone);

    if (!parsedDate) {
      return null;
    }

    const maxAllowedDate = moment.tz(timezone).add(quickSetupScheduleMaxMonthsAhead, 'months').startOf('day');

    return parsedDate.isAfter(maxAllowedDate, 'day') ? { dateNotWithinMaxRange: true } : null;
  };
}

export const recurringEndDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const form = control.parent as FormGroup | null;

  if (!form) {
    return null;
  }

  const startDate = form.get('startDate')?.value as string;
  const endDate = control.value as string;

  if (!startDate || !endDate) {
    return null;
  }

  return endDate >= startDate ? null : { invalidDateRange: true };
};

export const recurringLastTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const group = control.parent as FormGroup | null;

  if (!group) {
    return null;
  }

  const firstTime = group.get('firstTime')?.value as string;
  const lastTime = control.value as string;

  if (!firstTime || !lastTime) {
    return null;
  }

  const firstMinutes = timeToMinutes(firstTime);
  const lastMinutes = timeToMinutes(lastTime);

  if (Number.isNaN(firstMinutes) || Number.isNaN(lastMinutes)) {
    return null;
  }

  return lastMinutes >= firstMinutes ? null : { invalidTimeRange: true };
};

export const singleTimeSlotEndTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const group = control.parent as FormGroup | null;
  const formArray = group?.parent as FormArray<FormGroup> | null;

  if (!group) {
    return null;
  }

  const startTime = group.get('startTime')?.value as string;
  const endTime = control.value as string;

  if (!startTime || !endTime) {
    return null;
  }

  const durationInMinutes = calculateDurationInMinutes(startTime, endTime);

  if (durationInMinutes === null || durationInMinutes <= 0) {
    return { invalidTimeRange: true };
  }

  if (!formArray || formArray.disabled || formArray.controls.length <= 1) {
    return null;
  }

  const referenceRow = formArray.at(0).getRawValue() as { endTime: string; startTime: string };
  const referenceDuration = calculateDurationInMinutes(referenceRow.startTime, referenceRow.endTime);

  if (referenceDuration === null) {
    return null;
  }

  const slotIndex = formArray.controls.indexOf(group);

  if (slotIndex > 0 && durationInMinutes !== referenceDuration) {
    return { inconsistentDuration: true };
  }

  return null;
};

export const singleTimeSlotStartTimeDuplicateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const group = control.parent as FormGroup | null;
  const formArray = group?.parent as FormArray<FormGroup> | null;

  if (!group || !formArray || formArray.disabled) {
    return null;
  }

  const startTime = control.value as string;

  if (!startTime) {
    return null;
  }

  const duplicateCount = formArray.controls.filter(slot => (slot.get('startTime')?.value as string) === startTime).length;

  return duplicateCount > 1 ? { duplicateStartTime: true } : null;
};

export const specificDateDuplicateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const formArray = control.parent as FormArray<FormControl<string>> | null;

  if (!formArray || formArray.disabled) {
    return null;
  }

  const date = control.value as string;

  if (!date) {
    return null;
  }

  const duplicateCount = formArray.controls.filter(dateControl => (dateControl.value as string) === date).length;

  return duplicateCount > 1 ? { duplicateSpecificDate: true } : null;
};

export const recurringFirstTimeOrderValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const group = control.parent as FormGroup | null;
  const ranges = group?.parent as FormArray<FormGroup> | null;

  if (!group || !ranges) {
    return null;
  }

  const index = ranges.controls.indexOf(group);

  if (index <= 0) {
    return null;
  }

  const previousLastTime = ranges.at(index - 1)?.get('lastTime')?.value as string;
  const currentFirstTime = control.value as string;

  if (!previousLastTime || !currentFirstTime) {
    return null;
  }

  const previousLastMinutes = timeToMinutes(previousLastTime);
  const currentFirstMinutes = timeToMinutes(currentFirstTime);

  if (!Number.isNaN(previousLastMinutes) && !Number.isNaN(currentFirstMinutes) && currentFirstMinutes <= previousLastMinutes) {
    return { rangesOutOfOrder: true };
  }

  return null;
};

export function resolveRecurringDatesFormErrors(form: FormGroup, timezone?: string): ValidationErrors | null {
  const dateFrequency = form.get('dateFrequency')?.value as CalendarDateFrequency;

  if (dateFrequency !== CalendarDateFrequency.RecurrentDates) {
    return null;
  }

  const selectedWeekdays = (form.get('selectedWeekdays')?.value ?? []) as ScheduleWeekDay[];

  if (selectedWeekdays.length === 0) {
    return { weekdaysRequired: true };
  }

  const filledDateRanges = resolveFilledQuickSetupDateRanges(readQuickSetupDateRangesFromForm(form));

  if (filledDateRanges.length === 0) {
    return null;
  }

  const weekdaysInRange = new Set(getWeekDaysInDateRanges(filledDateRanges, timezone));
  const weekdaysNotInRange = selectedWeekdays.filter(weekday => !weekdaysInRange.has(weekday));

  if (weekdaysNotInRange.length > 0) {
    return { weekdaysNotInRange: { weekdays: weekdaysNotInRange } };
  }

  return null;
}

export function createRecurringDatesValidator(resolveTimezone?: () => string | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    return resolveRecurringDatesFormErrors(control, resolveTimezone?.());
  };
}

export const recurringDatesValidator = createRecurringDatesValidator();

const SALES_WINDOW_TYPE_CONTROL = 'type';
const SALES_ACTIVATION_TYPES: readonly CalendarSalesActivationType[] = Object.values(CalendarSalesActivationType);

const resolveSalesWindowType = (control: AbstractControl): CalendarSalesActivationType | null => {
  const type: unknown = control.parent?.get(SALES_WINDOW_TYPE_CONTROL)?.value;

  return SALES_ACTIVATION_TYPES.find(candidate => candidate === type) ?? null;
};

export function createSalesActivationFixedDateTimeValidator(resolveTimezone?: () => string | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (resolveSalesWindowType(control) !== CalendarSalesActivationType.FixedDate) {
      return null;
    }

    const timezone = resolveTimezone?.() ?? 'UTC';
    const parsedDateTime = parseQuickSetupSalesActivationDateTime(String(control.value ?? ''), timezone);

    if (!parsedDateTime) {
      return { required: true };
    }

    return parsedDateTime.isBefore(moment.tz(timezone).startOf('day')) ? { dateNotBeforeToday: true } : null;
  };
}

export const salesActivationDeltaValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (resolveSalesWindowType(control) !== CalendarSalesActivationType.RelativeTo) {
    return null;
  }

  const delta = parseQuickSetupNullableNumber(control.value);

  if (delta === null) {
    return { required: true };
  }

  return delta < 0 ? { min: { actual: delta, min: 0 } } : null;
};

export const salesActivationDeltaOptionValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (resolveSalesWindowType(control) !== CalendarSalesActivationType.RelativeTo) {
    return null;
  }

  return control.value ? null : { required: true };
};
