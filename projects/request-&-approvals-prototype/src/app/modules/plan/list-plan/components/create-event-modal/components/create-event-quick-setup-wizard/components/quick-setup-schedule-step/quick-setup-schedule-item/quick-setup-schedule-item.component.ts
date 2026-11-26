import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ScheduleTierCalendarDragHintComponent } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-tier-calendar-drag-hint/schedule-tier-calendar-drag-hint.component';
import { ScheduleTierCalendarComponent } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-tier-calendar/schedule-tier-calendar.component';
import { ScheduleTierCalendarDragPaint } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-tier-calendar/schedule-tier-calendar.model';
import {
  CalendarDateFrequency,
  CalendarSalesActivationDeltaReference,
  CalendarSalesActivationType,
  CalendarTimeSlotFrequency,
  ScheduleCalendar,
  ScheduleDay,
  ScheduleWeekDay,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { GenericOption } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-options.models';
import {
  DEFAULT_QUICK_SETUP_SALES_ACTIVATION_END_RELATIVE,
  DEFAULT_QUICK_SETUP_SALES_ACTIVATION_START_RELATIVE,
  QUICK_SETUP_SALES_ACTIVATION_END_TYPES,
  QUICK_SETUP_SALES_ACTIVATION_START_TYPES,
  QUICK_SETUP_SALES_ACTIVATION_TIME_UNITS,
  QUICK_SETUP_SALES_ACTIVATION_TRANSLATION_PREFIX,
  QuickSetupCalendarGridParams,
  QuickSetupDateRangeFormGroup,
  QuickSetupDateRangeRowViewModel,
  QuickSetupDateRangesFormArray,
  QuickSetupDateRowViewModel,
  QuickSetupDayExceptionSubmitValue,
  QuickSetupDayExceptionValue,
  QuickSetupRecurringRangeRowViewModel,
  QuickSetupSalesActivationFormGroup,
  QuickSetupSalesActivationFormValue,
  QuickSetupSalesActivationRelativeDefault,
  QuickSetupSalesWindowFormGroup,
  QuickSetupSalesWindowFormValue,
  QuickSetupSalesWindowViewModel,
  QuickSetupScheduleFormPatchValue,
  QuickSetupScheduleFormValue,
  QuickSetupSingleTimeSlotRowViewModel,
  QuickSetupWeekdayViewModel,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge, type Observable } from 'rxjs';
import { map, pairwise, startWith } from 'rxjs/operators';

import { QuickSetupDayExceptionsComponent } from '../components/quick-setup-day-exceptions/quick-setup-day-exceptions.component';
import {
  createDateNotAfterMaxAllowedValidator,
  createDateNotBeforeTodayValidator,
  excludedDateConflictsWithDayExceptionValidator,
  excludedDateInRangeValidator,
  recurringEndDateValidator,
  recurringFirstTimeOrderValidator,
  recurringLastTimeValidator,
  singleTimeSlotEndTimeValidator,
  singleTimeSlotStartTimeDuplicateValidator,
  specificDateDuplicateValidator,
} from '../quick-setup-schedule-step.validators';
import { formatQuickSetupSalesActivationNow, parseQuickSetupNullableNumber } from '../utils/quick-setup-sales-activation.util';
import { createQuickSetupDateRangeOverlapValidator } from '../utils/quick-setup-schedule-date-range.util';
import {
  SESSION_TYPES_REQUIRED_ERROR_TRANSLATION_KEY,
  shouldShowSessionTypesRequiredError,
  shouldShowWeekdaysNotInRangeError,
  shouldShowWeekdaysRequiredError,
  WEEKDAYS_NOT_IN_RANGE_ERROR_TRANSLATION_KEY,
  WEEKDAYS_REQUIRED_ERROR_TRANSLATION_KEY,
} from '../utils/quick-setup-schedule-form-errors.util';
import {
  createDefaultQuickSetupScheduleFormValue,
  createScheduleItemDateRangeRow,
  createScheduleItemFormGroup,
  createScheduleItemRecurringRangeRow,
  createScheduleItemSingleTimeSlotRow,
  patchScheduleItemFormGroup,
} from '../utils/quick-setup-schedule-form.factory';
import {
  buildQuickSetupDurationInputFormErrors,
  buildQuickSetupEndDateInputFormErrors,
  buildQuickSetupEndTimeInputFormErrors,
  buildQuickSetupExcludedDateInputFormErrors,
  buildQuickSetupFirstTimeInputFormErrors,
  buildQuickSetupLastTimeInputFormErrors,
  buildQuickSetupRepeatsEveryInputFormErrors,
  buildQuickSetupSalesDateTimeInputFormErrors,
  buildQuickSetupSalesDeltaInputFormErrors,
  buildQuickSetupSpecificDateInputFormErrors,
  buildQuickSetupStartDateInputFormErrors,
  buildQuickSetupStartTimeInputFormErrors,
  translateQuickSetupScheduleOverlapError,
} from '../utils/quick-setup-schedule-input-form-errors.util';
import {
  applyQuickSetupCalendarDays,
  applyTierToQuickSetupDay,
  buildQuickSetupScheduleCalendar,
  calculateDurationInMinutes,
  calendarToQuickSetupDays,
  mergeQuickSetupCalendarDays,
  resolveQuickSetupTierIds,
  resolveQuickSetupTimeLabels,
} from '../utils/quick-setup-schedule.util';
import { localeOrderedWeekdays, toScheduleCalendarMonthKey } from '../utils/schedule-calendar-view.util';

type OnChangeFn = (value: QuickSetupScheduleFormValue | null) => void;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntFieldErrorComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntRadioComponent,
    IgntRadioGroupComponent,
    IgntTypeaheadModule,
    MultiSelectModule,
    NgTemplateOutlet,
    QuickSetupDayExceptionsComponent,
    ReactiveFormsModule,
    ScheduleTierCalendarComponent,
    ScheduleTierCalendarDragHintComponent,
    TranslateModule,
  ],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuickSetupScheduleItemComponent),
    },
    {
      multi: true,
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => QuickSetupScheduleItemComponent),
    },
  ],
  selector: 'app-quick-setup-schedule-item',
  styleUrl: './quick-setup-schedule-item.component.scss',
  templateUrl: './quick-setup-schedule-item.component.html',
})
export class QuickSetupScheduleItemComponent implements ControlValueAccessor, Validator {
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #translateService = inject(TranslateService);

  readonly availableSessionTypeIds = input.required<number[]>();
  readonly capacityTemplateId = input.required<string | null>();
  readonly sessionTypeOptions = input.required<GenericOption[]>();
  readonly tierOptions = input.required<GenericOption[]>();
  readonly isPricesByTier = input(false);
  readonly locale = input.required<string>();
  readonly timezone = input('UTC');
  readonly calendarScrollToMonth = output<string>();

  protected readonly calendarDateFrequency = CalendarDateFrequency;
  protected readonly calendarTimeSlotFrequency = CalendarTimeSlotFrequency;
  #keySeed = 0;
  protected readonly form = createScheduleItemFormGroup(this.#formBuilder, {
    nextRowKey: this.#nextRowKey.bind(this),
    resolveTimezone: () => this.timezone(),
  });
  readonly #dayExceptionsControl = this.form.controls.dayExceptions as FormControl<QuickSetupDayExceptionValue[]>;
  readonly #excludedDates = this.form.controls.excludedDates as FormArray<FormControl<string>>;
  readonly #recurringRanges = this.form.controls.recurringRanges as FormArray<FormGroup>;
  readonly #selectedSessionTypeIdsControl = this.form.controls.selectedSessionTypeIds as FormControl<number[]>;
  readonly #singleTimeSlots = this.form.controls.singleTimeSlots as FormArray<FormGroup>;
  readonly #dateRanges = this.form.controls.dateRanges as QuickSetupDateRangesFormArray; // built by createScheduleItemFormGroup
  readonly #specificDates = this.form.controls.specificDates as FormArray<FormControl<string>>;
  readonly #salesActivation = this.form.controls.salesActivation as QuickSetupSalesActivationFormGroup; // built by createScheduleItemFormGroup
  #isWritingValue = false;
  #dateRangeScrollSnapshot: string[] = [];
  #lastEmittedValue: string | undefined;
  #onChange: OnChangeFn | undefined;
  #onTouched: (() => void) | undefined;
  #onValidatorChange: (() => void) | undefined;
  readonly #dateRangeRowKeys = signal<string[]>([]);
  readonly #specificDateRowKeys = signal<string[]>([]);
  readonly #excludedDateRowKeys = signal<string[]>([]);
  readonly #tierIds = computed(() => resolveQuickSetupTierIds(this.tierOptions()));
  readonly #hasScheduleTierOptions = computed(() => this.#tierIds().normalTierId !== null);
  readonly #hasScheduleItemData = computed(
    () => this.capacityTemplateId() !== null && this.#hasScheduleTierOptions() && this.availableSessionTypeIds().length > 0,
  );
  protected readonly calendarDays = signal<ScheduleDay[]>([]);
  #calendarStructureKey = '';
  #previousTimeLabels: string[] = [];
  protected readonly isAssigningTiers = computed(() => this.isPricesByTier());

  constructor() {
    this.#syncRowKeysFromForm();

    afterNextRender(() => {
      this.#lastEmittedValue = this.#serialize(this.#mapFormValue());
      this.#updateConditionalValidators();

      this.form.controls.dateFrequency.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(dateFrequency => {
        if (dateFrequency === CalendarDateFrequency.RecurrentDates) {
          this.#resetSelectedWeekdays();
        } else {
          this.#clearDayExceptions();
        }

        this.#updateConditionalValidators();
      });

      this.form.controls.timeSlotFrequency.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.#updateConditionalValidators();
      });

      this.salesWindowGroups.start.controls.type.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(type => {
        this.#onSalesWindowTypeChange(this.salesWindowGroups.start, type, DEFAULT_QUICK_SETUP_SALES_ACTIVATION_START_RELATIVE);
      });

      this.salesWindowGroups.end.controls.type.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(type => {
        this.#onSalesWindowTypeChange(this.salesWindowGroups.end, type, DEFAULT_QUICK_SETUP_SALES_ACTIVATION_END_RELATIVE);
      });

      merge(this.form.statusChanges, this.form.valueChanges)
        .pipe(startWith(null), takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          this.#syncValidityFromForm();
          this.#syncCalendarDaysFromForm();
        });

      merge(this.#recurringRanges.valueChanges, this.form.controls.repeatsEveryMinutes.valueChanges)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          this.#updateRecurringRangeCrossValidity();
        });

      this.#singleTimeSlots.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.#updateSingleTimeSlotCrossValidity();
      });

      this.#specificDates.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.#updateSpecificDateCrossValidity();
      });

      merge(this.#dateRanges.valueChanges, this.form.controls.selectedWeekdays.valueChanges)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          this.#updateRecurringDatesCrossValidity();
        });

      this.#syncDateRangeScrollSnapshot();

      merge(
        this.#dateRangesCalendarScrollMonth$(),
        this.#specificDatesCalendarScrollMonth$(),
        this.#excludedDatesCalendarScrollMonth$(),
        this.#dayExceptionsCalendarScrollMonth$(),
      )
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(monthKey => {
          if (monthKey) {
            this.calendarScrollToMonth.emit(monthKey);
          }
        });

      merge(this.#excludedDates.valueChanges, this.#dayExceptionsControl.valueChanges)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          this.#updateExcludedAndDayExceptionCrossValidity();
        });
    });

    effect(() => {
      this.isAssigningTiers();
      this.tierOptions();
      this.#updateConditionalValidators();
      this.#syncCalendarDaysFromForm();
    });
  }

  readonly #formState = signal(0);
  readonly #formValid = signal(false);
  readonly #showSectionValidationErrors = signal(false);
  protected readonly durationInputFormErrors = buildQuickSetupDurationInputFormErrors(this.#translateService);
  protected readonly endDateInputFormErrors = buildQuickSetupEndDateInputFormErrors(this.#translateService);
  protected readonly endTimeInputFormErrors = buildQuickSetupEndTimeInputFormErrors(this.#translateService);
  protected readonly excludedDateInputFormErrors = buildQuickSetupExcludedDateInputFormErrors(this.#translateService);
  protected readonly firstTimeInputFormErrors = buildQuickSetupFirstTimeInputFormErrors(this.#translateService);
  protected readonly lastTimeInputFormErrors = buildQuickSetupLastTimeInputFormErrors(this.#translateService);
  protected readonly repeatsEveryInputFormErrors = buildQuickSetupRepeatsEveryInputFormErrors(this.#translateService);
  protected readonly salesDateTimeInputFormErrors = buildQuickSetupSalesDateTimeInputFormErrors(this.#translateService);
  protected readonly salesDeltaInputFormErrors = buildQuickSetupSalesDeltaInputFormErrors(this.#translateService);
  protected readonly salesActivationTranslationPrefix = QUICK_SETUP_SALES_ACTIVATION_TRANSLATION_PREFIX;
  protected readonly salesActivationStartTypes = QUICK_SETUP_SALES_ACTIVATION_START_TYPES;
  protected readonly salesActivationEndTypes = QUICK_SETUP_SALES_ACTIVATION_END_TYPES;
  protected readonly salesActivationTimeUnitOptions: SelectOption[] = QUICK_SETUP_SALES_ACTIVATION_TIME_UNITS.map(timeUnit => ({
    id: timeUnit,
    title: this.#translateService.instant(`${QUICK_SETUP_SALES_ACTIVATION_TRANSLATION_PREFIX}.fields.time.${timeUnit}`),
  }));
  protected readonly salesActivationDeltaReferenceOptions: SelectOption[] = Object.values(CalendarSalesActivationDeltaReference).map(
    reference => ({
      id: reference,
      title: this.#translateService.instant(`${QUICK_SETUP_SALES_ACTIVATION_TRANSLATION_PREFIX}.fields.when.${reference}`),
    }),
  );
  protected readonly salesWindowGroups = this.#salesActivation.controls;
  protected readonly salesWindows = computed(() => {
    this.#formState();

    return {
      end: this.#buildSalesWindowView(this.salesWindowGroups.end),
      start: this.#buildSalesWindowView(this.salesWindowGroups.start),
    };
  });
  protected readonly sessionTypesRequiredErrorMessage = computed(() => {
    this.#formState();

    if (!shouldShowSessionTypesRequiredError(this.form)) {
      return null;
    }

    return this.#translateService.instant(SESSION_TYPES_REQUIRED_ERROR_TRANSLATION_KEY);
  });
  protected readonly showSectionValidationErrors = this.#showSectionValidationErrors.asReadonly();
  protected readonly showWeekdaysNotInRangeError = computed(() => {
    this.#formState();

    return this.isRecurrentDates() && shouldShowWeekdaysNotInRangeError(this.form);
  });
  protected readonly showWeekdaysRequiredError = computed(() => {
    this.#formState();

    return this.isRecurrentDates() && shouldShowWeekdaysRequiredError(this.form);
  });
  protected readonly specificDateInputFormErrors = buildQuickSetupSpecificDateInputFormErrors(this.#translateService);
  protected readonly startDateInputFormErrors = buildQuickSetupStartDateInputFormErrors(this.#translateService);
  protected readonly startTimeInputFormErrors = buildQuickSetupStartTimeInputFormErrors(this.#translateService);
  protected readonly weekdaysNotInRangeErrorTranslationKey = WEEKDAYS_NOT_IN_RANGE_ERROR_TRANSLATION_KEY;
  protected readonly weekdaysRequiredErrorTranslationKey = WEEKDAYS_REQUIRED_ERROR_TRANSLATION_KEY;
  protected readonly canDeleteDate = computed(() => {
    this.#formState();

    return this.#specificDates.length > 1;
  });
  protected readonly canDeleteDateRange = computed(() => {
    this.#formState();

    return this.#dateRanges.length > 1;
  });
  protected readonly canDeleteRecurringRange = computed(() => {
    this.#formState();

    return this.#recurringRanges.length > 1;
  });
  protected readonly canDeleteTimeSlot = computed(() => {
    this.#formState();

    return this.#singleTimeSlots.length > 1;
  });
  protected readonly isItemValid = computed(() => this.#formValid() && this.#hasScheduleItemData());
  protected readonly isRecurrentDates = computed(() => {
    this.#formState();

    return this.form.controls.dateFrequency.value === CalendarDateFrequency.RecurrentDates;
  });
  protected readonly isRecurrentTimeSlots = computed(() => {
    this.#formState();

    return this.form.controls.timeSlotFrequency.value === CalendarTimeSlotFrequency.RecurrentTimeSlots;
  });
  protected readonly shouldShowDayExceptions = computed(() => this.isRecurrentDates() && this.isAssigningTiers());
  protected readonly scheduleSelectedSessionTypeIds = computed(() => {
    this.#formState();

    return this.#resolveSelectedSessionTypeIds();
  });
  protected readonly mappedScheduleFormValue = computed(() => {
    this.#formState();

    return this.#mapFormValue();
  });
  protected readonly canShowTierCalendarGrid = computed(() => {
    const formValue = this.mappedScheduleFormValue();

    return formValue !== null && this.#canShowCalendarGrid(formValue);
  });
  protected readonly normalTierId = computed(() => this.#tierIds().normalTierId);
  protected readonly shouldShowTierCalendar = computed(() => {
    this.#formState();

    if (!this.isAssigningTiers()) {
      return false;
    }

    const formValue = this.#mapFormValue();

    if (formValue === null) {
      return false;
    }

    return this.#canShowCalendarGrid(formValue);
  });
  protected readonly calendarGridParams = computed<QuickSetupCalendarGridParams>(() => {
    this.#formState();

    if (this.isRecurrentTimeSlots()) {
      const ranges = this.#recurringRanges.controls;
      const firstRangeValue = ranges[0]?.get('firstTime')?.value;
      const firstRangeLastTime = ranges[0]?.get('lastTime')?.value;
      const lastRangeLastTime = ranges[ranges.length - 1]?.get('lastTime')?.value;
      const hasMultipleRanges = ranges.length > 1;
      const formValue = this.#mapFormValue();
      const timeLabels = formValue === null ? [] : resolveQuickSetupTimeLabels(formValue);
      const repeatsEveryMinutes = Number(this.form.controls.repeatsEveryMinutes.value);

      return {
        duration: Number.isFinite(repeatsEveryMinutes) && repeatsEveryMinutes > 0 ? repeatsEveryMinutes : undefined,
        endTime: String((hasMultipleRanges ? lastRangeLastTime : firstRangeLastTime) ?? ''),
        fixedTimeSlots: hasMultipleRanges ? timeLabels : [],
        startTime: String(firstRangeValue ?? ''),
      };
    }

    const times = this.#singleTimeSlots.controls.map(slot => String(slot.get('startTime')?.value ?? '')).filter(time => time.length > 0);

    return {
      duration: 60,
      endTime: '',
      fixedTimeSlots: times,
      startTime: times[0] ?? '',
    };
  });
  protected readonly calendarTimeLabels = computed(() => {
    this.#formState();
    const formValue = this.#mapFormValue();

    return formValue === null ? [] : resolveQuickSetupTimeLabels(formValue);
  });
  protected readonly excludedDateRows = computed<QuickSetupDateRowViewModel[]>(() => {
    const rowKeys = this.#excludedDateRowKeys();

    return rowKeys.map((rowKey, index) => ({
      control: this.#excludedDates.at(index),
      index,
      rowKey,
    }));
  });
  protected readonly recurringRangeRows = computed<QuickSetupRecurringRangeRowViewModel[]>(() => {
    this.#formState();

    return this.#recurringRanges.controls.map((range, index) => ({
      firstTimeControl: range.get('firstTime') as FormControl<string>,
      index,
      key: range.get('key')!.value as string,
      lastTimeControl: range.get('lastTime') as FormControl<string>,
    }));
  });
  protected readonly singleTimeSlotRows = computed<QuickSetupSingleTimeSlotRowViewModel[]>(() => {
    this.#formState();

    return this.#singleTimeSlots.controls.map((slot, index) => ({
      endTimeControl: slot.get('endTime') as FormControl<string>,
      index,
      key: slot.get('key')!.value as string,
      startTimeControl: slot.get('startTime') as FormControl<string>,
    }));
  });
  protected readonly dateRangeRows = computed<QuickSetupDateRangeRowViewModel[]>(() => {
    this.#formState();
    const rowKeys = this.#dateRangeRowKeys();

    return rowKeys.map((key, index) => {
      const row = this.#dateRanges.at(index);

      return {
        endDateControl: row.controls.endDate,
        index,
        key,
        startDateControl: row.controls.startDate,
      };
    });
  });
  protected readonly specificDateRows = computed<QuickSetupDateRowViewModel[]>(() => {
    const rowKeys = this.#specificDateRowKeys();

    return rowKeys.map((rowKey, index) => ({
      control: this.#specificDates.at(index),
      index,
      rowKey,
    }));
  });
  protected readonly weekdayViewModels = computed<QuickSetupWeekdayViewModel[]>(() => {
    this.#formState();

    const selectedWeekdays = this.form.controls.selectedWeekdays.value ?? [];
    const weekdaysNotInRange = new Set(this.#resolveWeekdaysNotInRangeError());

    return localeOrderedWeekdays(this.locale()).map(weekday => ({
      isOutOfRange: weekdaysNotInRange.has(weekday),
      isSelected: selectedWeekdays.includes(weekday),
      labelKey: `createEvent.quickSetupWizard.step3.weekdays.${weekday}`,
      weekday,
    }));
  });
  protected readonly productOptions = computed<SelectOption[]>(() => {
    const availableSessionTypeIds = new Set(this.availableSessionTypeIds());

    return this.sessionTypeOptions()
      .filter(option => typeof option.id === 'number' && availableSessionTypeIds.has(option.id))
      .map(option => ({
        id: option.id,
        title: option.title,
      }));
  });
  protected readonly selectedProductOptions = computed<SelectOption[]>(() => {
    this.#formState();
    const selectedSessionTypeIds = new Set(this.#selectedSessionTypeIdsControl.value ?? []);

    return this.productOptions().filter(option => selectedSessionTypeIds.has(option.id));
  });
  protected readonly mappedExcludedDates = computed(
    () => {
      this.#formState();

      return this.#excludedDates.controls
        .filter(control => control.enabled)
        .map(control => control.value)
        .filter(Boolean);
    },
    {
      equal: (previous, next) => previous.length === next.length && previous.every((date, index) => date === next[index]),
    },
  );

  registerOnChange(fn: OnChangeFn): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.#onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.form.disabled === isDisabled) {
      return;
    }

    if (isDisabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
      this.#updateConditionalValidators();
    }
  }

  validate(): ValidationErrors | null {
    if (this.form.disabled || this.form.valid) {
      return null;
    }

    return { invalidScheduleItem: true };
  }

  setSelectedSessionTypeIds(sessionTypeIds: number[]): void {
    this.#selectedSessionTypeIdsControl.setValue([...sessionTypeIds], { emitEvent: false });
    this.#syncValidityFromForm();
  }

  writeValue(value: QuickSetupScheduleFormPatchValue | null): void {
    this.#isWritingValue = true;

    try {
      if (value === null) {
        this.#resetFormToDefaults();
      } else {
        patchScheduleItemFormGroup(this.#formBuilder, this.form, value, this.#nextRowKey.bind(this));
        this.#syncRowKeysFromForm();
        this.#updateConditionalValidators();
      }

      this.#lastEmittedValue = this.#serialize(this.#mapFormValue() ?? this.#mapRawFormValue());
    } finally {
      this.#isWritingValue = false;
      this.#syncDateRangeScrollSnapshot();
    }
  }

  getFormValue(): QuickSetupScheduleFormValue | null {
    if (!this.isItemValid()) {
      return null;
    }

    return this.#mapFormValue();
  }

  getScheduleFormValue(): QuickSetupScheduleFormValue | null {
    return this.#mapFormValue() ?? this.#mapRawFormValue();
  }

  markFormAsTouched(): void {
    this.form.markAllAsTouched();
    this.#showSectionValidationErrors.set(true);
    this.#onTouched?.();
  }

  submit(): ScheduleCalendar | null {
    if (!this.isItemValid()) {
      this.markFormAsTouched();
      return null;
    }

    const formValue = this.#mapFormValue();

    if (!formValue) {
      this.markFormAsTouched();
      return null;
    }

    const capacityTemplateId = this.capacityTemplateId();

    if (!capacityTemplateId) {
      this.markFormAsTouched();
      return null;
    }

    return this.#buildSubmittedCalendar(formValue, capacityTemplateId);
  }

  protected addDate(): void {
    this.#specificDateRowKeys.update(keys => [...keys, this.#nextRowKey('specific-date')]);
    this.#specificDates.push(this.#createSpecificDateControl());
    this.#updateSpecificDateCrossValidity();
  }

  protected addDateRange(): void {
    this.#dateRangeRowKeys.update(keys => [...keys, this.#nextRowKey('date-range')]);
    this.#dateRanges.push(this.#createDateRangeRow());
    this.#updateDateRangeValidators();
    this.#updateDateRangeCrossValidity();
  }

  protected openNativePicker(field: IgntInputFieldComponent): void {
    try {
      field.inputElement?.nativeElement?.showPicker?.();
    } catch {
      // showPicker requires a user gesture; ignore browser rejection to avoid unhandled errors.
    }
  }

  protected addExcludedDate(): void {
    this.#excludedDateRowKeys.update(keys => [...keys, this.#nextRowKey('excluded-date')]);
    this.#excludedDates.push(
      this.#formBuilder.nonNullable.control('', [
        Validators.required,
        excludedDateInRangeValidator,
        excludedDateConflictsWithDayExceptionValidator,
      ]),
    );
  }

  protected addRecurringRange(): void {
    this.#recurringRanges.push(this.#createRecurringRangeRow());
    this.#updateRecurringRangeValidators();
    this.#updateRecurringRangeCrossValidity();
  }

  protected addTimeSlot(): void {
    this.#singleTimeSlots.push(this.#createSingleTimeSlotRow({ endTime: '', startTime: '' }));
    this.#updateSingleTimeSlotValidators();
    this.#updateSingleTimeSlotCrossValidity();
  }

  protected onDayChange(day: ScheduleDay): void {
    this.calendarDays.update(days =>
      days.map(currentDay => {
        const isSameWeekday = day.weekDayName !== null && currentDay.weekDayName === day.weekDayName;
        const isSameDate = day.specificDate !== null && currentDay.specificDate === day.specificDate;

        return isSameWeekday || isSameDate ? day : currentDay;
      }),
    );
  }

  protected onProductsSelected(options: SelectOption[]): void {
    const selectedSessionTypeIds = options.map(option => option.id).filter((id): id is number => typeof id === 'number');

    this.#selectedSessionTypeIdsControl.setValue(selectedSessionTypeIds);
    this.#selectedSessionTypeIdsControl.markAsTouched();
    this.#syncValidityFromForm();
  }

  protected onSalesWindowDeltaReferenceSelected(window: QuickSetupSalesWindowFormGroup, option: SelectOption | undefined): void {
    this.#setSalesWindowOption(window.controls.deltaReference, Object.values(CalendarSalesActivationDeltaReference), option);
  }

  protected onSalesWindowTimeUnitSelected(window: QuickSetupSalesWindowFormGroup, option: SelectOption | undefined): void {
    this.#setSalesWindowOption(window.controls.deltaTimeUnit, QUICK_SETUP_SALES_ACTIVATION_TIME_UNITS, option);
  }

  protected onTierCalendarDragPaint(paints: ScheduleTierCalendarDragPaint[]): void {
    const paintsByColumn = new Map(paints.map(paint => [paint.columnIndex, paint]));

    this.calendarDays.update(days =>
      days.map((day, columnIndex) => {
        const paint = paintsByColumn.get(columnIndex);

        if (paint === undefined) {
          return day;
        }

        return applyTierToQuickSetupDay(day, paint.times, paint.tierId);
      }),
    );
  }

  protected onWeekdayTileSpaceKey(event: Event, weekday: ScheduleWeekDay): void {
    event.preventDefault();
    this.toggleWeekday(weekday);
  }

  protected removeDate(index: number): void {
    if (!this.canDeleteDate()) {
      return;
    }

    this.#specificDateRowKeys.update(keys => keys.filter((_, rowIndex) => rowIndex !== index));
    this.#specificDates.removeAt(index);
    this.#updateSpecificDateCrossValidity();
  }

  protected removeDateRange(index: number): void {
    if (!this.canDeleteDateRange()) {
      return;
    }

    this.#dateRangeRowKeys.update(keys => keys.filter((_, rowIndex) => rowIndex !== index));
    this.#dateRanges.removeAt(index);
    this.#updateDateRangeValidators();
    this.#updateDateRangeCrossValidity();
  }

  protected removeExcludedDate(index: number): void {
    this.#excludedDateRowKeys.update(keys => keys.filter((_, rowIndex) => rowIndex !== index));
    this.#excludedDates.removeAt(index);
  }

  protected removeRecurringRange(index: number): void {
    if (!this.canDeleteRecurringRange()) {
      return;
    }

    this.#recurringRanges.removeAt(index);
    this.#updateRecurringRangeValidators();
    this.#updateRecurringRangeCrossValidity();
  }

  protected removeTimeSlot(index: number): void {
    if (!this.canDeleteTimeSlot()) {
      return;
    }

    this.#singleTimeSlots.removeAt(index);
    this.#updateSingleTimeSlotCrossValidity();
  }

  protected toggleWeekday(weekday: ScheduleWeekDay): void {
    const selectedWeekdays = [...(this.form.controls.selectedWeekdays.value ?? [])];
    const index = selectedWeekdays.indexOf(weekday);

    if (index >= 0) {
      selectedWeekdays.splice(index, 1);
    } else {
      selectedWeekdays.push(weekday);
    }

    this.form.controls.selectedWeekdays.setValue(selectedWeekdays);
    this.form.controls.selectedWeekdays.markAsTouched();
    this.form.updateValueAndValidity();
  }

  #applySalesWindowRelativeDefault(
    window: QuickSetupSalesWindowFormGroup,
    relativeDefault: QuickSetupSalesActivationRelativeDefault,
  ): void {
    window.controls.delta.setValue(relativeDefault.delta, { emitEvent: false });
    window.controls.deltaTimeUnit.setValue(relativeDefault.timeUnit, { emitEvent: false });
    window.controls.deltaReference.setValue(relativeDefault.reference, { emitEvent: false });
  }

  #areSalesWindowRelativeFieldsEmpty(window: QuickSetupSalesWindowFormGroup): boolean {
    const { delta, deltaReference, deltaTimeUnit } = window.controls;

    return parseQuickSetupNullableNumber(delta.value) === null && deltaTimeUnit.value === null && deltaReference.value === null;
  }

  #buildCalendarStructureKey(formValue: QuickSetupScheduleFormValue): string {
    const structureKey = [
      formValue.dateFrequency,
      formValue.timeSlotFrequency,
      formValue.specificDates.join(','),
      formValue.selectedWeekdays.join(','),
      formValue.singleTimeSlots.map(row => row.startTime).join(','),
      formValue.recurringRanges.map(range => `${range.firstTime}-${range.lastTime}`).join(','),
      String(formValue.repeatsEveryMinutes),
    ].join('|');

    if (!this.isAssigningTiers()) {
      return structureKey;
    }

    return `${structureKey}|open-tier:${this.#tierIds().normalTierId ?? 'none'}`;
  }

  #buildSubmittedCalendar(formValue: QuickSetupScheduleFormValue, capacityTemplateId: string): ScheduleCalendar {
    const calendar = buildQuickSetupScheduleCalendar({
      capacityTemplateId,
      dayExceptions: this.#mapDayExceptionSubmitValues(),
      formValue,
      sessionTypeIds: this.#resolveSelectedSessionTypeIds(),
      tierIds: this.#tierIds(),
      timezone: this.timezone(),
    });

    if (!this.shouldShowTierCalendar() || this.calendarDays().length === 0) {
      return calendar;
    }

    return applyQuickSetupCalendarDays(calendar, this.calendarDays());
  }

  #buildSalesWindowView(window: QuickSetupSalesWindowFormGroup): QuickSetupSalesWindowViewModel {
    const { deltaReference, deltaTimeUnit, type } = window.controls;

    return {
      isFixedDate: type.value === CalendarSalesActivationType.FixedDate,
      isRelative: type.value === CalendarSalesActivationType.RelativeTo,
      selectedDeltaReferenceOption: this.salesActivationDeltaReferenceOptions.find(option => option.id === deltaReference.value),
      selectedTimeUnitOption: this.salesActivationTimeUnitOptions.find(option => option.id === deltaTimeUnit.value),
    };
  }

  #canShowCalendarGrid(formValue: QuickSetupScheduleFormValue): boolean {
    const hasDates =
      formValue.dateFrequency === CalendarDateFrequency.RecurrentDates
        ? formValue.selectedWeekdays.length > 0
        : formValue.specificDates.length > 0;

    return hasDates && resolveQuickSetupTimeLabels(formValue).length > 0;
  }

  #clearCalendarDaysState(): void {
    if (this.calendarDays().length === 0 && this.#calendarStructureKey === '' && this.#previousTimeLabels.length === 0) {
      return;
    }

    this.calendarDays.set([]);
    this.#calendarStructureKey = '';
    this.#previousTimeLabels = [];
  }

  #clearDayExceptions(): void {
    this.#dayExceptionsControl.setValue([], { emitEvent: false });
  }

  #createDateRangeRow(
    defaults: { endDate?: string; startDate?: string; withDefaultStartDate?: boolean } = {},
  ): QuickSetupDateRangeFormGroup {
    return createScheduleItemDateRangeRow(this.#formBuilder, defaults);
  }

  #createRecurringRangeRow({ withDefaultFirstTime = false }: { withDefaultFirstTime?: boolean } = {}): FormGroup {
    return createScheduleItemRecurringRangeRow(this.#formBuilder, this.#nextRowKey.bind(this), { withDefaultFirstTime });
  }

  #mapDateRangesFromForm(): QuickSetupScheduleFormValue['dateRanges'] {
    return this.#dateRanges.getRawValue();
  }

  #createSingleTimeSlotRow(defaults: { endTime?: string; startTime?: string } = {}): FormGroup {
    return createScheduleItemSingleTimeSlotRow(this.#formBuilder, this.#nextRowKey.bind(this), defaults);
  }

  #mapDayExceptionSubmitValues(): QuickSetupDayExceptionSubmitValue[] {
    if (!this.shouldShowDayExceptions()) {
      return [];
    }

    const availableIds = new Set(this.availableSessionTypeIds());

    return (this.#dayExceptionsControl.value ?? []).map(exception => ({
      calendarDays: exception.calendarDays,
      dates: exception.dates.filter(Boolean),
      selectedSessionTypeIds: exception.selectedSessionTypeIds.filter(sessionTypeId => availableIds.has(sessionTypeId)),
    }));
  }

  #mapFormValue(): QuickSetupScheduleFormValue | null {
    const dateFrequency = this.form.controls.dateFrequency.value;
    const timeSlotFrequency = this.form.controls.timeSlotFrequency.value;

    if (dateFrequency === null || timeSlotFrequency === null) {
      return null;
    }

    const durationInMinutes = this.#resolveDurationInMinutes(timeSlotFrequency);

    if (durationInMinutes === null) {
      return null;
    }

    const dateRanges = this.#mapDateRangesFromForm();

    return {
      dateFrequency,
      dateRanges,
      name: String(this.form.controls.name.value ?? '').trim(),
      dayExceptions: (this.#dayExceptionsControl.value ?? []).map(exception => ({
        dates: exception.dates.filter(Boolean),
        selectedSessionTypeIds: [...exception.selectedSessionTypeIds],
      })),
      durationInMinutes,
      excludedDates:
        dateFrequency === CalendarDateFrequency.RecurrentDates
          ? this.#excludedDates.controls.map(control => control.getRawValue()).filter(Boolean)
          : [],
      recurringRanges: this.#recurringRanges.controls.map(range => {
        const row = range.getRawValue() as { firstTime: string; lastTime: string };

        return {
          firstTime: String(row.firstTime ?? ''),
          lastTime: String(row.lastTime ?? ''),
        };
      }),
      repeatsEveryMinutes: (() => {
        const value = this.form.controls.repeatsEveryMinutes.value;

        if (value === null || value === undefined) {
          return null;
        }

        const repeatsEveryMinutes = Number(value);

        return Number.isFinite(repeatsEveryMinutes) ? repeatsEveryMinutes : null;
      })(),
      salesActivation: this.#mapSalesActivationFromForm(),
      selectedSessionTypeIds: [...(this.#selectedSessionTypeIdsControl.value ?? [])],
      selectedWeekdays: [...(this.form.controls.selectedWeekdays.value ?? [])],
      singleTimeSlots: this.#singleTimeSlots.controls.map(slot => {
        const row = slot.getRawValue() as { endTime: string; startTime: string };

        return {
          endTime: String(row.endTime ?? ''),
          startTime: String(row.startTime ?? ''),
        };
      }),
      specificDates: this.#specificDates.controls.map(control => control.getRawValue()).filter(Boolean),
      timeSlotFrequency,
    };
  }

  #mapSalesActivationFromForm(): QuickSetupSalesActivationFormValue {
    return {
      end: this.#mapSalesWindowFromForm(this.salesWindowGroups.end),
      start: this.#mapSalesWindowFromForm(this.salesWindowGroups.start),
    };
  }

  #mapSalesWindowFromForm(window: QuickSetupSalesWindowFormGroup): QuickSetupSalesWindowFormValue {
    const raw = window.getRawValue();

    return { ...raw, delta: parseQuickSetupNullableNumber(raw.delta), fixedDateTime: String(raw.fixedDateTime ?? '') };
  }

  #nextRowKey(prefix: string): string {
    this.#keySeed += 1;
    return `${prefix}-${this.#keySeed}`;
  }

  #onSalesWindowTypeChange(
    window: QuickSetupSalesWindowFormGroup,
    type: CalendarSalesActivationType,
    relativeDefault: QuickSetupSalesActivationRelativeDefault,
  ): void {
    if (type === CalendarSalesActivationType.FixedDate && !window.controls.fixedDateTime.value) {
      window.controls.fixedDateTime.setValue(formatQuickSetupSalesActivationNow(this.timezone()), { emitEvent: false });
    }

    if (type === CalendarSalesActivationType.RelativeTo && this.#areSalesWindowRelativeFieldsEmpty(window)) {
      this.#applySalesWindowRelativeDefault(window, relativeDefault);
    }

    this.#refreshSalesWindowValidity(window);
  }

  #refreshSalesWindowValidity(window: QuickSetupSalesWindowFormGroup): void {
    Object.values(window.controls).forEach(control => control.updateValueAndValidity({ emitEvent: false }));
  }

  #resetSelectedWeekdays(): void {
    this.form.controls.selectedWeekdays.setValue([]);
    this.form.controls.selectedWeekdays.markAsUntouched();
    this.form.controls.selectedWeekdays.markAsPristine();
  }

  #resolveDurationInMinutes(timeSlotFrequency: CalendarTimeSlotFrequency): number | null {
    if (timeSlotFrequency === CalendarTimeSlotFrequency.SingleTimeSlots) {
      const firstSlot = this.#singleTimeSlots.at(0).getRawValue() as { endTime: string; startTime: string };
      return calculateDurationInMinutes(firstSlot.startTime, firstSlot.endTime);
    }

    const durationInMinutes = Number(this.form.controls.durationInMinutes.value);

    return Number.isFinite(durationInMinutes) ? durationInMinutes : null;
  }

  #resolveSelectedSessionTypeIds(): number[] {
    const availableSessionTypeIds = new Set(this.availableSessionTypeIds());
    const selectedSessionTypeIds = this.#selectedSessionTypeIdsControl.value ?? [];

    return selectedSessionTypeIds.filter(sessionTypeId => availableSessionTypeIds.has(sessionTypeId));
  }

  #setSalesWindowOption<T extends string>(
    control: FormControl<T | null>,
    allowedValues: readonly T[],
    option: SelectOption | undefined,
  ): void {
    control.setValue(allowedValues.find(value => value === option?.id) ?? null);
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  #syncCalendarDaysFromForm(): void {
    if (!this.isAssigningTiers()) {
      this.#clearCalendarDaysState();
      return;
    }

    const formValue = this.#mapFormValue();

    if (formValue === null || !this.#canShowCalendarGrid(formValue)) {
      return;
    }

    if (!this.#hasScheduleTierOptions()) {
      return;
    }

    const structureKey = this.#buildCalendarStructureKey(formValue);

    if (structureKey === this.#calendarStructureKey) {
      return;
    }

    const capacityTemplateId = this.capacityTemplateId();

    if (capacityTemplateId === null) {
      return;
    }

    const seededDays = calendarToQuickSetupDays(
      buildQuickSetupScheduleCalendar({
        capacityTemplateId,
        formValue,
        sessionTypeIds: this.#resolveSelectedSessionTypeIds(),
        tierIds: this.#tierIds(),
        timezone: this.timezone(),
      }),
    );
    const nextTimeLabels = resolveQuickSetupTimeLabels(formValue);

    this.calendarDays.set(
      mergeQuickSetupCalendarDays(
        untracked(() => this.calendarDays()),
        seededDays,
        this.#previousTimeLabels,
      ),
    );
    this.#calendarStructureKey = structureKey;
    this.#previousTimeLabels = nextTimeLabels;
  }

  #publishValueChange(markTouched = false): void {
    const value = this.#mapFormValue();

    if (value === null) {
      this.#onValidatorChange?.();
      return;
    }

    const serialized = this.#serialize(value);

    if (serialized === this.#lastEmittedValue) {
      return;
    }

    this.#lastEmittedValue = serialized;

    if (markTouched) {
      this.#onTouched?.();
    }

    this.#onChange?.(value);
  }

  #mapRawFormValue(): QuickSetupScheduleFormValue {
    const dateFrequency = this.form.controls.dateFrequency.value ?? CalendarDateFrequency.SingleDates;
    const timeSlotFrequency = this.form.controls.timeSlotFrequency.value ?? CalendarTimeSlotFrequency.SingleTimeSlots;
    const resolvedDuration = this.#resolveDurationInMinutes(timeSlotFrequency);
    const storedDuration = Number(this.form.controls.durationInMinutes.value);
    const durationInMinutes =
      resolvedDuration ??
      (Number.isFinite(storedDuration) ? storedDuration : createDefaultQuickSetupScheduleFormValue('').durationInMinutes);
    const dateRanges = this.#mapDateRangesFromForm();

    return {
      dateFrequency,
      dateRanges,
      name: String(this.form.controls.name.value ?? '').trim(),
      dayExceptions: (this.#dayExceptionsControl.value ?? []).map(exception => ({
        dates: exception.dates.filter(Boolean),
        selectedSessionTypeIds: [...exception.selectedSessionTypeIds],
      })),
      durationInMinutes,
      excludedDates: this.#excludedDates.controls.map(control => control.getRawValue()).filter(Boolean),
      recurringRanges: this.#recurringRanges.controls.map(range => {
        const row = range.getRawValue() as { firstTime: string; lastTime: string };

        return {
          firstTime: String(row.firstTime ?? ''),
          lastTime: String(row.lastTime ?? ''),
        };
      }),
      repeatsEveryMinutes: (() => {
        const value = this.form.controls.repeatsEveryMinutes.value;

        if (value === null || value === undefined) {
          return null;
        }

        const repeatsEveryMinutes = Number(value);

        return Number.isFinite(repeatsEveryMinutes) ? repeatsEveryMinutes : null;
      })(),
      salesActivation: this.#mapSalesActivationFromForm(),
      selectedSessionTypeIds: [...(this.#selectedSessionTypeIdsControl.value ?? [])],
      selectedWeekdays: [...(this.form.controls.selectedWeekdays.value ?? [])],
      singleTimeSlots: this.#singleTimeSlots.controls.map(slot => {
        const row = slot.getRawValue() as { endTime: string; startTime: string };

        return {
          endTime: String(row.endTime ?? ''),
          startTime: String(row.startTime ?? ''),
        };
      }),
      specificDates: this.#specificDates.controls.map(control => control.getRawValue()).filter(Boolean),
      timeSlotFrequency,
    };
  }

  #resetFormToDefaults(): void {
    patchScheduleItemFormGroup(this.#formBuilder, this.form, createDefaultQuickSetupScheduleFormValue(''), this.#nextRowKey.bind(this));
    this.#syncRowKeysFromForm();
    this.#clearCalendarDaysState();
  }

  #serialize(value: QuickSetupScheduleFormValue | null): string {
    return JSON.stringify(value);
  }

  #syncRowKeysFromForm(): void {
    this.#dateRangeRowKeys.set(this.#dateRanges.controls.map(() => this.#nextRowKey('date-range')));
    this.#specificDateRowKeys.set(this.#specificDates.controls.map(() => this.#nextRowKey('specific-date')));
    this.#excludedDateRowKeys.set(this.#excludedDates.controls.map(() => this.#nextRowKey('excluded-date')));
  }

  #syncValidityFromForm(): void {
    this.#formValid.set(this.form.valid);
    this.#formState.update(version => version + 1);

    if (!this.#isWritingValue) {
      this.#publishValueChange();
      this.#onValidatorChange?.();
    }
  }

  #flattenDayExceptionDates(exceptions: QuickSetupDayExceptionValue[] | null): readonly string[] {
    return (exceptions ?? []).flatMap(exception => exception.dates.filter(Boolean));
  }

  #dateRangeControlDatesFromForm(): string[] {
    return this.#dateRanges.controls.flatMap(row => {
      const { endDate, startDate } = row.getRawValue();

      return [startDate, endDate];
    });
  }

  #syncDateRangeScrollSnapshot(): void {
    this.#dateRangeScrollSnapshot = this.#dateRangeControlDatesFromForm();
  }

  #dateRangesCalendarScrollMonth$(): Observable<string | null> {
    return this.#dateRanges.valueChanges.pipe(
      map(() => {
        const nextDates = this.#dateRangeControlDatesFromForm();
        const monthKey = this.#firstChangedDateMonthKey(this.#dateRangeScrollSnapshot, nextDates);

        this.#dateRangeScrollSnapshot = nextDates;

        return monthKey;
      }),
    );
  }

  #specificDatesCalendarScrollMonth$(): Observable<string | null> {
    return this.#specificDates.valueChanges.pipe(
      startWith(this.#specificDates.getRawValue()),
      pairwise(),
      map(([previousDates, nextDates]) => this.#firstChangedDateMonthKey(previousDates, nextDates)),
    );
  }

  #excludedDatesCalendarScrollMonth$(): Observable<string | null> {
    return this.#excludedDates.valueChanges.pipe(
      startWith(null),
      map(() => this.#excludedDates.controls.map(control => control.getRawValue()).filter(Boolean)),
      pairwise(),
      map(([previousDates, nextDates]) => this.#firstChangedDateMonthKey(previousDates, nextDates)),
    );
  }

  #dayExceptionsCalendarScrollMonth$(): Observable<string | null> {
    return this.#dayExceptionsControl.valueChanges.pipe(
      startWith(this.#dayExceptionsControl.value),
      map(value => this.#flattenDayExceptionDates(value)),
      pairwise(),
      map(([previousDates, nextDates]) => this.#firstChangedDateMonthKey(previousDates, nextDates)),
    );
  }

  #firstChangedDateMonthKey(previousDates: readonly string[], nextDates: readonly string[]): string | null {
    for (let index = 0; index < nextDates.length; index += 1) {
      const nextDate = nextDates[index];

      if (nextDate === previousDates[index]) {
        continue;
      }

      const monthKey = toScheduleCalendarMonthKey(nextDate);

      if (monthKey) {
        return monthKey;
      }
    }

    return null;
  }

  #resolveWeekdaysNotInRangeError(): ScheduleWeekDay[] {
    const weekdaysNotInRangeError = this.form.errors?.['weekdaysNotInRange'] as { weekdays?: ScheduleWeekDay[] } | undefined;

    return weekdaysNotInRangeError?.weekdays ?? [];
  }

  #createSpecificDateControl(initialValue = ''): FormControl<string> {
    return this.#formBuilder.nonNullable.control(initialValue, this.#createBoundedScheduleDateValidators());
  }

  #createBoundedScheduleDateValidators(): ValidatorFn[] {
    const resolveTimezone = (): string => this.timezone();

    return [
      Validators.required,
      createDateNotBeforeTodayValidator(resolveTimezone),
      createDateNotAfterMaxAllowedValidator(resolveTimezone),
      specificDateDuplicateValidator,
    ];
  }

  #updateConditionalValidators(): void {
    const isRecurrentDates = this.form.controls.dateFrequency.value === CalendarDateFrequency.RecurrentDates;
    const isRecurrentTimeSlots = this.form.controls.timeSlotFrequency.value === CalendarTimeSlotFrequency.RecurrentTimeSlots;
    const shouldEnableDayExceptions = isRecurrentDates && this.isAssigningTiers();

    this.form.controls.repeatsEveryMinutes.setValidators(isRecurrentTimeSlots ? [Validators.required, Validators.min(1)] : []);

    this.form.controls.durationInMinutes.setValidators(isRecurrentTimeSlots ? [Validators.required, Validators.min(1)] : []);

    if (!isRecurrentTimeSlots) {
      this.form.controls.repeatsEveryMinutes.setValue(null, { emitEvent: false });
      this.form.controls.durationInMinutes.setValue(null, { emitEvent: false });
    }

    this.#specificDates.controls.forEach(control => {
      if (isRecurrentDates) {
        control.clearValidators();
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
        control.setValidators(this.#createBoundedScheduleDateValidators());
      }

      control.updateValueAndValidity({ emitEvent: false });
    });

    if (isRecurrentDates && this.#dateRanges.length === 0) {
      this.#dateRangeRowKeys.update(keys => [...keys, this.#nextRowKey('date-range')]);
      this.#dateRanges.push(this.#createDateRangeRow({ withDefaultStartDate: true }));
    }

    this.#updateDateRangeValidators();

    this.#excludedDates.controls.forEach(control => {
      if (!isRecurrentDates) {
        control.clearValidators();
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
        control.setValidators([Validators.required, excludedDateInRangeValidator, excludedDateConflictsWithDayExceptionValidator]);
      }

      control.updateValueAndValidity({ emitEvent: false });
    });

    if (shouldEnableDayExceptions) {
      this.#dayExceptionsControl.enable({ emitEvent: false });
    } else {
      this.#dayExceptionsControl.disable({ emitEvent: false });
    }

    this.#dayExceptionsControl.updateValueAndValidity({ emitEvent: false });

    this.#singleTimeSlots.controls.forEach(slot => {
      if (isRecurrentTimeSlots) {
        slot.disable({ emitEvent: false });
      } else {
        slot.enable({ emitEvent: false });
      }
    });

    this.#updateSingleTimeSlotValidators();

    this.#recurringRanges.controls.forEach(range => {
      if (isRecurrentTimeSlots) {
        range.enable({ emitEvent: false });
      } else {
        range.disable({ emitEvent: false });
      }
    });

    this.#updateRecurringRangeValidators();

    this.form.controls.repeatsEveryMinutes.updateValueAndValidity({ emitEvent: false });
    this.form.controls.durationInMinutes.updateValueAndValidity({ emitEvent: false });
    this.#refreshSalesActivationValidity();
    this.#updateDateRangeCrossValidity();
    this.#updateRecurringDatesCrossValidity();
    this.#updateExcludedAndDayExceptionCrossValidity();
    this.#updateRecurringRangeCrossValidity();
    this.#updateSingleTimeSlotCrossValidity();
    this.#updateSpecificDateCrossValidity();
    this.form.updateValueAndValidity({ emitEvent: false });
    this.#syncValidityFromForm();
  }

  #updateSpecificDateCrossValidity(): void {
    if (this.form.controls.dateFrequency.value !== CalendarDateFrequency.SingleDates) {
      return;
    }

    // Emit on each row so ignt-input-field repaints sibling errors; onlySelf avoids re-triggering the array subscription.
    this.#specificDates.controls.forEach(control => {
      control.updateValueAndValidity({ onlySelf: true });
    });

    this.#specificDates.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.#syncValidityFromForm();
  }

  #updateExcludedAndDayExceptionCrossValidity(): void {
    if (this.form.controls.dateFrequency.value !== CalendarDateFrequency.RecurrentDates) {
      return;
    }

    this.#excludedDates.controls.forEach(control => {
      control.updateValueAndValidity({ emitEvent: false });
    });
    this.#dayExceptionsControl.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.#syncValidityFromForm();
  }

  #updateDateRangeValidators(): void {
    const isRecurrentDates = this.form.controls.dateFrequency.value === CalendarDateFrequency.RecurrentDates;
    const dateNotBeforeTodayValidator = createDateNotBeforeTodayValidator(() => this.timezone());
    const dateNotAfterMaxAllowedValidator = createDateNotAfterMaxAllowedValidator(() => this.timezone());

    const dateRangeOverlapValidator = createQuickSetupDateRangeOverlapValidator(conflictRange =>
      translateQuickSetupScheduleOverlapError(this.#translateService, conflictRange),
    );

    for (const row of this.#dateRanges.controls) {
      const { endDate: endDateControl, startDate: startDateControl } = row.controls;

      if (!isRecurrentDates) {
        startDateControl.clearValidators();
        endDateControl.clearValidators();
        row.disable({ emitEvent: false });
      } else {
        row.enable({ emitEvent: false });
        startDateControl.setValidators([Validators.required, dateNotBeforeTodayValidator, dateRangeOverlapValidator]);
        endDateControl.setValidators([
          Validators.required,
          recurringEndDateValidator,
          dateNotAfterMaxAllowedValidator,
          dateRangeOverlapValidator,
        ]);
      }

      startDateControl.updateValueAndValidity({ emitEvent: false });
      endDateControl.updateValueAndValidity({ emitEvent: false });
    }

    this.#dateRanges.updateValueAndValidity({ emitEvent: false });
  }

  #updateDateRangeCrossValidity(): void {
    if (this.form.controls.dateFrequency.value !== CalendarDateFrequency.RecurrentDates) {
      return;
    }

    for (const row of this.#dateRanges.controls) {
      row.controls.startDate.updateValueAndValidity({ onlySelf: true });
      row.controls.endDate.updateValueAndValidity({ onlySelf: true });
      row.updateValueAndValidity({ emitEvent: false, onlySelf: true });
    }
    this.#dateRanges.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.#syncValidityFromForm();
  }

  #updateRecurringDatesCrossValidity(): void {
    if (this.form.controls.dateFrequency.value !== CalendarDateFrequency.RecurrentDates) {
      return;
    }

    this.#updateDateRangeCrossValidity();
    this.#excludedDates.controls.forEach(control => {
      control.updateValueAndValidity({ emitEvent: false });
    });
    this.#dayExceptionsControl.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.#syncValidityFromForm();
  }

  #updateRecurringRangeCrossValidity(): void {
    if (this.form.controls.timeSlotFrequency.value !== CalendarTimeSlotFrequency.RecurrentTimeSlots) {
      return;
    }

    this.#recurringRanges.controls.forEach((range, index) => {
      range.get('lastTime')?.updateValueAndValidity({ emitEvent: false });

      if (index > 0) {
        range.get('firstTime')?.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.#recurringRanges.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.#syncValidityFromForm();
  }

  #updateRecurringRangeValidators(): void {
    const isRecurrentTimeSlots = this.form.controls.timeSlotFrequency.value === CalendarTimeSlotFrequency.RecurrentTimeSlots;

    this.#recurringRanges.controls.forEach((range, index) => {
      if (!isRecurrentTimeSlots) {
        return;
      }

      range.get('firstTime')?.setValidators([Validators.required, ...(index > 0 ? [recurringFirstTimeOrderValidator] : [])]);
      range.get('lastTime')?.setValidators([Validators.required, recurringLastTimeValidator]);
      range.get('firstTime')?.updateValueAndValidity({ emitEvent: false });
      range.get('lastTime')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  #refreshSalesActivationValidity(): void {
    for (const window of [this.salesWindowGroups.start, this.salesWindowGroups.end]) {
      this.#refreshSalesWindowValidity(window);
    }

    this.#salesActivation.updateValueAndValidity({ emitEvent: false });
  }

  #updateSingleTimeSlotCrossValidity(): void {
    if (this.form.controls.timeSlotFrequency.value !== CalendarTimeSlotFrequency.SingleTimeSlots) {
      return;
    }

    this.#singleTimeSlots.controls.forEach(slot => {
      slot.get('endTime')?.updateValueAndValidity({ emitEvent: false });
      slot.get('startTime')?.updateValueAndValidity({ emitEvent: false });
    });

    this.#singleTimeSlots.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.#syncValidityFromForm();
  }

  #updateSingleTimeSlotValidators(): void {
    const isSingleTimeSlots = this.form.controls.timeSlotFrequency.value === CalendarTimeSlotFrequency.SingleTimeSlots;

    this.#singleTimeSlots.controls.forEach(slot => {
      if (!isSingleTimeSlots) {
        return;
      }

      slot.get('startTime')?.setValidators([Validators.required, singleTimeSlotStartTimeDuplicateValidator]);
      slot.get('endTime')?.setValidators([Validators.required, singleTimeSlotEndTimeValidator]);
      slot.get('startTime')?.updateValueAndValidity({ emitEvent: false });
      slot.get('endTime')?.updateValueAndValidity({ emitEvent: false });
      slot.updateValueAndValidity({ emitEvent: false });
    });
  }
}
