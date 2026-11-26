import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import {
  CalendarDateFrequency,
  CalendarSalesActivationDeltaReference,
  CalendarSalesActivationTimeUnit,
  CalendarTimeSlotFrequency,
  ScheduleWeekDay,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import {
  DEFAULT_QUICK_SETUP_END_TIME,
  DEFAULT_QUICK_SETUP_SALES_ACTIVATION_FORM_VALUE,
  DEFAULT_QUICK_SETUP_START_TIME,
  MAX_QUICK_SETUP_SCHEDULE_COUNT,
  QuickSetupDateRangeFormGroup,
  QuickSetupDateRangesFormArray,
  QuickSetupDayExceptionValue,
  QuickSetupSalesActivationFormGroup,
  QuickSetupSalesWindowFormGroup,
  QuickSetupSalesWindowFormValue,
  QuickSetupScheduleFormValue,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';

import {
  createRecurringDatesValidator,
  createSalesActivationFixedDateTimeValidator,
  salesActivationDeltaOptionValidator,
  salesActivationDeltaValidator,
  singleTimeSlotEndTimeValidator,
  singleTimeSlotStartTimeDuplicateValidator,
} from '../quick-setup-schedule-step.validators';
import { toLocalDateString } from './quick-setup-schedule.util';

export type ResolveTimezone = () => string | undefined;

export interface CreateScheduleItemFormGroupParams {
  nextRowKey: (prefix: string) => string;
  resolveTimezone?: ResolveTimezone;
}

export type QuickSetupDefaultScheduleNameFormatter = (scheduleNumber: number) => string;

export const resolveNextDefaultQuickSetupScheduleName = (
  existingNames: readonly string[],
  formatDefaultName: QuickSetupDefaultScheduleNameFormatter,
): string => {
  const usedNames = new Set(existingNames.map(name => name.trim()).filter(Boolean));

  let candidate = 1;

  while (usedNames.has(formatDefaultName(candidate)) && candidate < MAX_QUICK_SETUP_SCHEDULE_COUNT) {
    candidate += 1;
  }

  const resolvedName = formatDefaultName(candidate);

  if (!usedNames.has(resolvedName)) {
    return resolvedName;
  }

  let fallbackSuffix = 1;
  let fallbackName = `${resolvedName} (${fallbackSuffix})`;

  while (usedNames.has(fallbackName) && fallbackSuffix < MAX_QUICK_SETUP_SCHEDULE_COUNT) {
    fallbackSuffix += 1;
    fallbackName = `${resolvedName} (${fallbackSuffix})`;
  }

  return fallbackName;
};

export const createScheduleItemRecurringRangeRow = (
  formBuilder: FormBuilder,
  nextRowKey: (prefix: string) => string,
  { withDefaultFirstTime = false }: { withDefaultFirstTime?: boolean } = {},
): FormGroup =>
  formBuilder.group({
    firstTime: [withDefaultFirstTime ? DEFAULT_QUICK_SETUP_START_TIME : '', [Validators.required]],
    key: [nextRowKey('recurring-range'), { nonNullable: true }],
    lastTime: ['', [Validators.required]],
  });

export const createScheduleItemDateRangeRow = (
  formBuilder: FormBuilder,
  {
    endDate = '',
    startDate = '',
    withDefaultStartDate = false,
  }: { endDate?: string; startDate?: string; withDefaultStartDate?: boolean } = {},
): QuickSetupDateRangeFormGroup =>
  formBuilder.nonNullable.group({
    endDate,
    startDate: withDefaultStartDate ? toLocalDateString() : startDate,
  });

export const createScheduleItemSingleTimeSlotRow = (
  formBuilder: FormBuilder,
  nextRowKey: (prefix: string) => string,
  defaults: { endTime?: string; startTime?: string } = {},
): FormGroup =>
  formBuilder.group({
    endTime: [defaults.endTime ?? DEFAULT_QUICK_SETUP_END_TIME, [Validators.required, singleTimeSlotEndTimeValidator]],
    key: [nextRowKey('time-slot'), { nonNullable: true }],
    startTime: [defaults.startTime ?? DEFAULT_QUICK_SETUP_START_TIME, [Validators.required, singleTimeSlotStartTimeDuplicateValidator]],
  });

export const createScheduleItemSalesWindowFormGroup = (
  formBuilder: FormBuilder,
  defaults: QuickSetupSalesWindowFormValue,
  resolveTimezone?: ResolveTimezone,
): QuickSetupSalesWindowFormGroup =>
  formBuilder.group({
    delta: formBuilder.control<number | null>(defaults.delta, [salesActivationDeltaValidator]),
    deltaReference: formBuilder.control<CalendarSalesActivationDeltaReference | null>(defaults.deltaReference, [
      salesActivationDeltaOptionValidator,
    ]),
    deltaTimeUnit: formBuilder.control<CalendarSalesActivationTimeUnit | null>(defaults.deltaTimeUnit, [
      salesActivationDeltaOptionValidator,
    ]),
    fixedDateTime: formBuilder.nonNullable.control(defaults.fixedDateTime, [createSalesActivationFixedDateTimeValidator(resolveTimezone)]),
    type: formBuilder.nonNullable.control(defaults.type),
  });

export const createScheduleItemSalesActivationFormGroup = (
  formBuilder: FormBuilder,
  resolveTimezone?: ResolveTimezone,
): QuickSetupSalesActivationFormGroup =>
  formBuilder.group({
    end: createScheduleItemSalesWindowFormGroup(formBuilder, DEFAULT_QUICK_SETUP_SALES_ACTIVATION_FORM_VALUE.end, resolveTimezone),
    start: createScheduleItemSalesWindowFormGroup(formBuilder, DEFAULT_QUICK_SETUP_SALES_ACTIVATION_FORM_VALUE.start, resolveTimezone),
  });

export const createDefaultQuickSetupScheduleFormValue = (
  name: string,
  defaultSpecificDate: string = toLocalDateString(),
): QuickSetupScheduleFormValue => {
  return {
    dateFrequency: CalendarDateFrequency.SingleDates,
    dateRanges: [{ endDate: '', startDate: defaultSpecificDate }],
    dayExceptions: [],
    durationInMinutes: 120,
    excludedDates: [],
    name,
    recurringRanges: [{ firstTime: DEFAULT_QUICK_SETUP_START_TIME, lastTime: '' }],
    repeatsEveryMinutes: null,
    salesActivation: {
      end: { ...DEFAULT_QUICK_SETUP_SALES_ACTIVATION_FORM_VALUE.end },
      start: { ...DEFAULT_QUICK_SETUP_SALES_ACTIVATION_FORM_VALUE.start },
    },
    selectedSessionTypeIds: [],
    selectedWeekdays: [],
    singleTimeSlots: [{ endTime: DEFAULT_QUICK_SETUP_END_TIME, startTime: DEFAULT_QUICK_SETUP_START_TIME }],
    specificDates: defaultSpecificDate ? [defaultSpecificDate] : [''],
    timeSlotFrequency: CalendarTimeSlotFrequency.SingleTimeSlots,
  };
};

export const patchScheduleItemFormGroup = (
  formBuilder: FormBuilder,
  form: FormGroup,
  value: Partial<QuickSetupScheduleFormValue>,
  nextRowKey: (prefix: string) => string,
): void => {
  if (value.dateFrequency !== undefined) {
    form.controls.dateFrequency.setValue(value.dateFrequency, { emitEvent: false });
  }

  if (value.timeSlotFrequency !== undefined) {
    form.controls.timeSlotFrequency.setValue(value.timeSlotFrequency, { emitEvent: false });
  }

  if (value.durationInMinutes !== undefined) {
    form.controls.durationInMinutes.setValue(value.durationInMinutes, { emitEvent: false });
  }

  if (value.dateRanges !== undefined) {
    const dateRanges = form.controls.dateRanges as QuickSetupDateRangesFormArray; // built by createScheduleItemFormGroup

    dateRanges.clear({ emitEvent: false });

    for (const range of value.dateRanges) {
      dateRanges.push(createScheduleItemDateRangeRow(formBuilder, { endDate: range.endDate, startDate: range.startDate }), {
        emitEvent: false,
      });
    }
  }

  if (value.name !== undefined) {
    form.controls.name.setValue(value.name, { emitEvent: false });
  }

  if (value.repeatsEveryMinutes !== undefined) {
    form.controls.repeatsEveryMinutes.setValue(value.repeatsEveryMinutes, { emitEvent: false });
  }

  if (value.salesActivation !== undefined) {
    const salesActivation = form.controls.salesActivation as QuickSetupSalesActivationFormGroup; // built by createScheduleItemFormGroup

    salesActivation.setValue({ end: { ...value.salesActivation.end }, start: { ...value.salesActivation.start } }, { emitEvent: false });
  }

  if (value.selectedWeekdays !== undefined) {
    form.controls.selectedWeekdays.setValue([...value.selectedWeekdays], { emitEvent: false });
  }

  if (value.selectedSessionTypeIds !== undefined) {
    (form.controls.selectedSessionTypeIds as FormControl<number[]>).setValue([...value.selectedSessionTypeIds], { emitEvent: false });
  }

  if (value.specificDates !== undefined) {
    const specificDates = form.controls.specificDates as FormArray<FormControl<string>>;

    while (specificDates.length > 0) {
      specificDates.removeAt(0, { emitEvent: false });
    }

    value.specificDates.forEach(date => {
      specificDates.push(formBuilder.nonNullable.control(date, [Validators.required]), { emitEvent: false });
    });
  }

  if (value.excludedDates !== undefined) {
    const excludedDates = form.controls.excludedDates as FormArray<FormControl<string>>;

    while (excludedDates.length > 0) {
      excludedDates.removeAt(0, { emitEvent: false });
    }

    value.excludedDates.forEach(date => {
      excludedDates.push(formBuilder.nonNullable.control(date, [Validators.required]), { emitEvent: false });
    });
  }

  if (value.singleTimeSlots !== undefined) {
    const singleTimeSlots = form.controls.singleTimeSlots as FormArray<FormGroup>;

    while (singleTimeSlots.length > 0) {
      singleTimeSlots.removeAt(0, { emitEvent: false });
    }

    value.singleTimeSlots.forEach(slot => {
      singleTimeSlots.push(createScheduleItemSingleTimeSlotRow(formBuilder, nextRowKey, slot), { emitEvent: false });
    });
  }

  if (value.recurringRanges !== undefined) {
    const recurringRanges = form.controls.recurringRanges as FormArray<FormGroup>;

    while (recurringRanges.length > 0) {
      recurringRanges.removeAt(0, { emitEvent: false });
    }

    value.recurringRanges.forEach((range, index) => {
      recurringRanges.push(
        createScheduleItemRecurringRangeRow(formBuilder, nextRowKey, { withDefaultFirstTime: index === 0 && range.firstTime.length > 0 }),
        { emitEvent: false },
      );
      recurringRanges.at(index)?.patchValue(
        {
          firstTime: range.firstTime,
          lastTime: range.lastTime,
        },
        { emitEvent: false },
      );
    });
  }

  if (value.dayExceptions !== undefined) {
    const dayExceptionsControl = form.controls.dayExceptions as FormControl<QuickSetupDayExceptionValue[]>;
    const existingExceptions = dayExceptionsControl.value ?? [];

    dayExceptionsControl.setValue(
      value.dayExceptions.map((exception, index) => {
        const existingException = existingExceptions[index];

        return {
          calendarDays: existingException?.calendarDays ?? [],
          dates: [...exception.dates],
          key: existingException?.key ?? nextRowKey('day-exception'),
          selectedSessionTypeIds: [...exception.selectedSessionTypeIds],
        };
      }),
      { emitEvent: false },
    );
  }
};

export const createScheduleItemFormGroup = (
  formBuilder: FormBuilder,
  { nextRowKey, resolveTimezone }: CreateScheduleItemFormGroupParams,
): FormGroup =>
  formBuilder.group(
    {
      dateFrequency: [CalendarDateFrequency.SingleDates, [Validators.required]],
      dateRanges: formBuilder.array([createScheduleItemDateRangeRow(formBuilder, { withDefaultStartDate: true })]),
      dayExceptions: formBuilder.nonNullable.control<QuickSetupDayExceptionValue[]>([]),
      durationInMinutes: [null as number | null],
      excludedDates: formBuilder.array<FormControl<string>>([]),
      key: [nextRowKey('schedule-item'), { nonNullable: true }],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      recurringRanges: formBuilder.array<FormGroup>([
        createScheduleItemRecurringRangeRow(formBuilder, nextRowKey, { withDefaultFirstTime: true }),
      ]),
      repeatsEveryMinutes: [null as number | null],
      salesActivation: createScheduleItemSalesActivationFormGroup(formBuilder, resolveTimezone),
      selectedSessionTypeIds: formBuilder.nonNullable.control<number[]>([], [Validators.required]),
      selectedWeekdays: [[] as ScheduleWeekDay[]],
      singleTimeSlots: formBuilder.array<FormGroup>([createScheduleItemSingleTimeSlotRow(formBuilder, nextRowKey)]),
      specificDates: formBuilder.array<FormControl<string>>([formBuilder.nonNullable.control(toLocalDateString())]),
      timeSlotFrequency: [CalendarTimeSlotFrequency.SingleTimeSlots, [Validators.required]],
    },
    { validators: [createRecurringDatesValidator(resolveTimezone)] },
  );
