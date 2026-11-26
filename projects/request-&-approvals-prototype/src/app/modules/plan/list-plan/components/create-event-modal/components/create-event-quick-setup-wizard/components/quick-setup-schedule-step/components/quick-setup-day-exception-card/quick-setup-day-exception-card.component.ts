import {
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
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';

import { ScheduleTierCalendarComponent } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-tier-calendar/schedule-tier-calendar.component';
import { ScheduleTierCalendarDragPaint } from '@fz-original/app/modules/inventory/inventory-schedule/components/schedule-tier-calendar/schedule-tier-calendar.model';
import { ScheduleDay } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { GenericOption } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-options.models';
import {
  QuickSetupCalendarGridParams,
  QuickSetupDateRowViewModel,
  QuickSetupDayExceptionValue,
  QuickSetupRecurrentDateRangeRow,
  QuickSetupScheduleFormValue,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { EXCEPTION_SESSION_TYPES_REQUIRED_ERROR_TRANSLATION_KEY } from '../../utils/quick-setup-schedule-form-errors.util';
import { buildQuickSetupExceptionDateInputFormErrors } from '../../utils/quick-setup-schedule-input-form-errors.util';
import {
  applyTierToQuickSetupDay,
  buildQuickSetupExceptionStructureKey,
  resolveQuickSetupTimeLabels,
  syncQuickSetupExceptionCalendarDays,
  SyncQuickSetupExceptionCalendarDaysResult,
} from '../../utils/quick-setup-schedule.util';
import {
  CARD_EXCEPTION_DETAIL_ERROR_KEY,
  createDayExceptionLocalDateValidators,
  QuickSetupDayExceptionValidationContext,
  QuickSetupDayExceptionValidationErrorDetail,
} from '../quick-setup-day-exceptions/quick-setup-day-exceptions.validators';

type OnChangeFn = (value: QuickSetupDayExceptionValue) => void;

const validationContextKeyDelimiter = '\u0000';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntInputFieldComponent,
    MultiSelectModule,
    ReactiveFormsModule,
    ScheduleTierCalendarComponent,
    TranslateModule,
  ],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuickSetupDayExceptionCardComponent),
    },
    {
      multi: true,
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => QuickSetupDayExceptionCardComponent),
    },
  ],
  selector: 'app-quick-setup-day-exception-card',
  styleUrl: './quick-setup-day-exception-card.component.scss',
  templateUrl: './quick-setup-day-exception-card.component.html',
})
export class QuickSetupDayExceptionCardComponent implements ControlValueAccessor, Validator {
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #translateService = inject(TranslateService);

  readonly calendarGridParams = input.required<QuickSetupCalendarGridParams>();
  readonly canShowCalendarGrid = input(false);
  readonly dateRanges = input<QuickSetupRecurrentDateRangeRow[]>([]);
  readonly exceptionIndex = input(0);
  readonly excludedDates = input<string[]>([]);
  readonly isAssigningTiers = input(false);
  readonly isRecurrentDates = input(false);
  readonly normalTierId = input<number | null>(null);
  readonly productOptions = input.required<SelectOption[]>();
  readonly scheduleFormValue = input<QuickSetupScheduleFormValue | null>(null);
  readonly showValidationErrors = input(false);
  readonly tierOptions = input.required<GenericOption[]>();
  readonly timeLabels = input.required<string[]>();
  readonly timezone = input('UTC');

  readonly remove = output<void>();

  readonly #calendarDays = signal<ScheduleDay[]>([]);
  readonly #dateRowKeys = signal<string[]>([]);
  readonly #datesVersion = signal(0);
  readonly #exceptionKey = signal('');
  readonly #isDisabled = signal(false);
  readonly #lastValidationContextKey = signal('');
  readonly #previousTimeLabels = signal<string[]>([]);
  readonly #structureKey = signal('');
  #keySeed = 0;
  #lastEmittedValue: string | undefined;
  #onChange: OnChangeFn | undefined;
  #onTouched: (() => void) | undefined;
  #onValidatorChange: (() => void) | undefined;

  readonly #form = this.#formBuilder.group({
    dates: this.#formBuilder.array<FormControl<string>>([]),
    selectedSessionTypeIds: this.#formBuilder.nonNullable.control<number[]>([], [Validators.required]),
  });

  protected readonly calendarDays = this.#calendarDays.asReadonly();
  protected readonly exceptionDateInputFormErrors = buildQuickSetupExceptionDateInputFormErrors(this.#translateService);
  protected readonly canDeleteDate = computed(() => {
    this.#datesVersion();

    return this.#dates.length > 1;
  });
  protected readonly dateRows = computed<QuickSetupDateRowViewModel[]>(() => {
    this.#datesVersion();

    return this.#dateRowKeys().map((rowKey, dateIndex) => ({
      control: this.#dates.at(dateIndex),
      index: dateIndex,
      rowKey,
    }));
  });
  protected readonly selectedProductOptions = computed(() => {
    this.#datesVersion();
    const selectedSessionTypeIds = new Set(this.#form.controls.selectedSessionTypeIds.value);

    return this.productOptions().filter(option => selectedSessionTypeIds.has(option.id));
  });
  protected readonly sessionTypesRequiredErrorMessage = computed(() => {
    this.#datesVersion();
    const control = this.#form.controls.selectedSessionTypeIds;
    const shouldShow =
      !this.#form.disabled &&
      control.invalid &&
      !!control.errors?.required &&
      (control.touched || control.dirty || this.showValidationErrors());

    if (!shouldShow) {
      return null;
    }

    return this.#translateService.instant(EXCEPTION_SESSION_TYPES_REQUIRED_ERROR_TRANSLATION_KEY);
  });
  protected readonly showTierCalendar = computed(() => {
    this.#datesVersion();

    if (!this.isAssigningTiers() || !this.canShowCalendarGrid()) {
      return false;
    }

    return this.#dates.controls.some(control => Boolean(control.value));
  });

  get #dates(): FormArray<FormControl<string>> {
    return this.#form.controls.dates;
  }

  constructor() {
    this.#form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#datesVersion.update(version => version + 1);
      this.#syncCalendarDaysFromSchedule();
      this.#emitValue();
    });

    this.#form.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#onValidatorChange?.();
    });

    effect(() => {
      this.canShowCalendarGrid();
      this.isAssigningTiers();
      this.isRecurrentDates();
      this.normalTierId();
      this.scheduleFormValue();
      this.#datesVersion();
      this.#syncCalendarDaysFromSchedule();
    });

    effect(() => {
      const validationContextKey = this.#buildValidationContextKey();

      if (validationContextKey === this.#lastValidationContextKey()) {
        return;
      }

      this.#lastValidationContextKey.set(validationContextKey);
      this.#updateDateValidators();
    });
  }

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
    this.#isDisabled.set(isDisabled);

    if (this.#form.disabled === isDisabled) {
      return;
    }

    if (isDisabled) {
      this.#form.disable({ emitEvent: false });
    } else {
      this.#form.enable({ emitEvent: false });
      this.#updateDateValidators();
    }
  }

  validate(): ValidationErrors | null {
    if (this.#form.disabled) {
      return null;
    }

    const detail: QuickSetupDayExceptionValidationErrorDetail = {
      dates: this.#dates.controls.map(control => control.errors),
      selectedSessionTypeIds: this.#form.controls.selectedSessionTypeIds.errors,
    };

    if (!detail.dates.some(Boolean) && detail.selectedSessionTypeIds === null) {
      return null;
    }

    return { [CARD_EXCEPTION_DETAIL_ERROR_KEY]: detail };
  }

  writeValue(value: QuickSetupDayExceptionValue | null): void {
    if (value === null) {
      return;
    }

    const serialized = this.#serialize(value);

    if (serialized === this.#lastEmittedValue) {
      return;
    }

    this.#exceptionKey.set(value.key);
    this.#calendarDays.set(value.calendarDays);
    this.#setDatesFormArray(value.dates.length > 0 ? value.dates : ['']);
    this.#form.controls.selectedSessionTypeIds.setValue([...value.selectedSessionTypeIds], { emitEvent: false });
    this.#datesVersion.update(version => version + 1);
    this.#lastEmittedValue = serialized;

    if (value.calendarDays.length === 0) {
      this.#structureKey.set('');
      this.#previousTimeLabels.set([]);
      this.#syncCalendarDaysFromSchedule();

      return;
    }

    const formValue = this.scheduleFormValue();
    const normalTierId = this.normalTierId();
    const dates = value.dates.filter(Boolean);

    if (formValue !== null && normalTierId !== null && dates.length > 0) {
      this.#structureKey.set(buildQuickSetupExceptionStructureKey(value.key, dates, formValue, this.isAssigningTiers(), normalTierId));
      this.#previousTimeLabels.set(resolveQuickSetupTimeLabels(formValue));
    }
  }

  protected addDate(): void {
    this.#dateRowKeys.update(keys => [...keys, this.#nextRowKey('day-exception-date')]);
    this.#dates.push(this.#createDateControl());
    this.#onTouched?.();
  }

  protected onDayChange(day: ScheduleDay): void {
    this.#calendarDays.update(days =>
      days.map(currentDay => {
        const isSameDate = day.specificDate !== null && currentDay.specificDate === day.specificDate;

        return isSameDate ? day : currentDay;
      }),
    );
    this.#emitValue();
  }

  protected onDragPaint(paints: ScheduleTierCalendarDragPaint[]): void {
    const paintsByColumn = new Map(paints.map(paint => [paint.columnIndex, paint]));

    this.#calendarDays.update(days =>
      days.map((day, columnIndex) => {
        const paint = paintsByColumn.get(columnIndex);

        if (paint === undefined) {
          return day;
        }

        return applyTierToQuickSetupDay(day, paint.times, paint.tierId);
      }),
    );
    this.#emitValue();
  }

  protected onProductsSelected(options: SelectOption[]): void {
    const selectedSessionTypeIds = options.map(option => option.id).filter((id): id is number => typeof id === 'number');

    this.#form.controls.selectedSessionTypeIds.setValue(selectedSessionTypeIds);
    this.#form.controls.selectedSessionTypeIds.markAsTouched();
    this.#onTouched?.();
  }

  protected onValidationRefresh(): void {
    this.#updateDateValidators();
    this.#onTouched?.();
  }

  protected openNativePicker(field: IgntInputFieldComponent): void {
    try {
      field.inputElement?.nativeElement?.showPicker?.();
    } catch {
      // showPicker requires a user gesture; ignore browser rejection to avoid unhandled errors.
    }
  }

  protected removeDate(dateIndex: number): void {
    if (!this.canDeleteDate()) {
      return;
    }

    this.#dateRowKeys.update(keys => keys.filter((_, rowIndex) => rowIndex !== dateIndex));
    this.#dates.removeAt(dateIndex);
    this.#onTouched?.();
  }

  #buildValidationContextKey(): string {
    return `${this.dateRanges()
      .map(range => `${range.startDate}-${range.endDate}`)
      .join(validationContextKeyDelimiter)}|${this.excludedDates().join(validationContextKeyDelimiter)}`;
  }

  #createDateControl(value = ''): FormControl<string> {
    return this.#formBuilder.nonNullable.control(value, this.#resolveDateValidators());
  }

  #emitValue(): void {
    const value = this.#mapCurrentValue();
    const serialized = this.#serialize(value);

    if (serialized === this.#lastEmittedValue) {
      return;
    }

    this.#lastEmittedValue = serialized;
    this.#onChange?.(value);
  }

  #mapCurrentValue(): QuickSetupDayExceptionValue {
    return {
      calendarDays: this.#calendarDays(),
      dates: this.#dates.controls.filter(control => control.enabled).map(control => control.value),
      key: this.#exceptionKey(),
      selectedSessionTypeIds: [...this.#form.controls.selectedSessionTypeIds.value],
    };
  }

  #nextRowKey(prefix: string): string {
    this.#keySeed += 1;

    return `${prefix}-${this.#keySeed}`;
  }

  #resolveDateValidators() {
    return createDayExceptionLocalDateValidators(this.#validationContext());
  }

  #serialize(value: QuickSetupDayExceptionValue): string {
    return JSON.stringify([
      value.key,
      value.dates,
      value.selectedSessionTypeIds,
      value.calendarDays.map(day => [
        day.specificDate,
        day.weekDayName,
        day.timeSlots.map(slot => [slot.time, slot.tierId, slot.isVisible, slot.disabled]),
      ]),
    ]);
  }

  #setDatesFormArray(dates: string[]): void {
    this.#dateRowKeys.set(dates.map(() => this.#nextRowKey('day-exception-date')));

    this.#dates.clear({ emitEvent: false });

    dates.forEach(date => {
      this.#dates.push(this.#createDateControl(date), { emitEvent: false });
    });

    this.#datesVersion.update(version => version + 1);
  }

  #syncCalendarDaysFromSchedule(): void {
    if (this.#clearCalendarDaysWhenSyncDisabled()) {
      return;
    }

    const syncResult = this.#buildCalendarDaysSyncResult();

    if (syncResult === null || !syncResult.changed) {
      return;
    }

    this.#applyCalendarDaysSyncResult(syncResult);
  }

  #clearCalendarDaysWhenSyncDisabled(): boolean {
    if (this.isRecurrentDates() && this.isAssigningTiers()) {
      return false;
    }

    if (this.#calendarDays().length === 0 && this.#structureKey() === '') {
      return true;
    }

    this.#resetCalendarDaysState();
    this.#emitValue();

    return true;
  }

  #buildCalendarDaysSyncResult(): SyncQuickSetupExceptionCalendarDaysResult | null {
    const formValue = this.scheduleFormValue();
    const normalTierId = this.normalTierId();

    if (formValue === null || !this.canShowCalendarGrid() || normalTierId === null) {
      return null;
    }

    const dates = untracked(() => this.#dates.controls.map(control => control.value).filter(Boolean));
    const timeLabels = resolveQuickSetupTimeLabels(formValue);

    return syncQuickSetupExceptionCalendarDays({
      calendarDays: untracked(() => this.#calendarDays()),
      dates,
      exceptionKey: untracked(() => this.#exceptionKey()),
      formValue,
      isAssigningTiers: this.isAssigningTiers(),
      normalTierId,
      previousTimeLabels: untracked(() => this.#previousTimeLabels()),
      structureKey: untracked(() => this.#structureKey()),
      timeLabels,
    });
  }

  #applyCalendarDaysSyncResult(syncResult: SyncQuickSetupExceptionCalendarDaysResult): void {
    this.#calendarDays.set(syncResult.calendarDays);
    this.#structureKey.set(syncResult.structureKey);
    this.#previousTimeLabels.set(syncResult.previousTimeLabels);
    this.#emitValue();
  }

  #resetCalendarDaysState(): void {
    this.#calendarDays.set([]);
    this.#structureKey.set('');
    this.#previousTimeLabels.set([]);
  }

  #updateDateValidators(): void {
    if (this.#form.disabled) {
      return;
    }

    const dateValidators = this.#resolveDateValidators();

    this.#dates.controls.forEach(dateControl => {
      dateControl.setValidators(dateValidators);
      dateControl.updateValueAndValidity();
    });

    this.#form.controls.selectedSessionTypeIds.setValidators([Validators.required]);
    this.#form.controls.selectedSessionTypeIds.updateValueAndValidity({ emitEvent: false });
    this.#form.updateValueAndValidity({ emitEvent: false });
    this.#onValidatorChange?.();
  }

  #validationContext(): QuickSetupDayExceptionValidationContext {
    return {
      dateRanges: this.dateRanges(),
      excludedDates: this.excludedDates(),
    };
  }
}
