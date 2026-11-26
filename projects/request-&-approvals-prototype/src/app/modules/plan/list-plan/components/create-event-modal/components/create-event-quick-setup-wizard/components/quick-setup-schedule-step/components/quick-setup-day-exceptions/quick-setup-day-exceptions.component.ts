import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, forwardRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormBuilder,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
} from '@angular/forms';

import { GenericOption } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-options.models';
import {
  QuickSetupCalendarGridParams,
  QuickSetupDayExceptionValue,
  QuickSetupRecurrentDateRangeRow,
  QuickSetupScheduleFormValue,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { QuickSetupDayExceptionCardComponent } from '../quick-setup-day-exception-card/quick-setup-day-exception-card.component';
import {
  CARD_EXCEPTION_DETAIL_ERROR_KEY,
  mergeDayExceptionValidationDetailsFromValues,
  QUICK_SETUP_DAY_EXCEPTION_DETAILS_ERROR_KEY,
  QuickSetupDayExceptionValidationErrorDetail,
} from './quick-setup-day-exceptions.validators';

type OnChangeFn = (value: QuickSetupDayExceptionValue[]) => void;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, QuickSetupDayExceptionCardComponent, ReactiveFormsModule, TranslateModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuickSetupDayExceptionsComponent),
    },
    {
      multi: true,
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => QuickSetupDayExceptionsComponent),
    },
  ],
  selector: 'app-quick-setup-day-exceptions',
  styleUrl: './quick-setup-day-exceptions.component.scss',
  templateUrl: './quick-setup-day-exceptions.component.html',
})
export class QuickSetupDayExceptionsComponent implements ControlValueAccessor, Validator {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);

  readonly calendarGridParams = input.required<QuickSetupCalendarGridParams>();
  readonly calendarTimeLabels = input.required<string[]>();
  readonly canShowCalendarGrid = input(false);
  readonly dateRanges = input<QuickSetupRecurrentDateRangeRow[]>([]);
  readonly excludedDates = input<string[]>([]);
  readonly isAssigningTiers = input(false);
  readonly isRecurrentDates = input(false);
  readonly normalTierId = input<number | null>(null);
  readonly productOptions = input.required<SelectOption[]>();
  readonly scheduleFormValue = input<QuickSetupScheduleFormValue | null>(null);
  readonly selectedSessionTypeIds = input<number[]>([]);
  readonly showValidationErrors = input(false);
  readonly tierOptions = input.required<GenericOption[]>();
  readonly timezone = input('UTC');

  readonly #isCollapsed = signal(false);
  #keySeed = 0;
  #lastEmittedValue: string | undefined;
  #onChange: OnChangeFn | undefined;
  #onTouched: (() => void) | undefined;
  #onValidatorChange: (() => void) | undefined;

  protected readonly exceptionsForm = this.#formBuilder.array<QuickSetupDayExceptionValue>([]);
  protected readonly isCollapsed = this.#isCollapsed.asReadonly();

  constructor() {
    this.exceptionsForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#publishValueChange(true);
    });

    this.exceptionsForm.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#onValidatorChange?.();
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
    if (this.exceptionsForm.disabled === isDisabled) {
      return;
    }

    if (isDisabled) {
      this.exceptionsForm.disable({ emitEvent: false });
    } else {
      this.exceptionsForm.enable({ emitEvent: false });
    }
  }

  validate(): ValidationErrors | null {
    if (this.exceptionsForm.disabled) {
      return null;
    }

    this.exceptionsForm.controls.forEach(control => {
      control.updateValueAndValidity({ emitEvent: false });
    });

    const cardDetails = this.#collectCardValidationDetails();
    const details = mergeDayExceptionValidationDetailsFromValues(cardDetails, this.#getExceptionValues());

    if (!details.some(detail => detail.dates.some(dateErrors => dateErrors !== null) || detail.selectedSessionTypeIds !== null)) {
      return null;
    }

    return { [QUICK_SETUP_DAY_EXCEPTION_DETAILS_ERROR_KEY]: details };
  }

  writeValue(value: QuickSetupDayExceptionValue[] | null): void {
    const nextValue = value ?? [];

    this.exceptionsForm.clear({ emitEvent: false });

    nextValue.forEach(exceptionValue => {
      this.exceptionsForm.push(this.#formBuilder.nonNullable.control(exceptionValue), { emitEvent: false });
    });

    this.#lastEmittedValue = this.#serialize(this.#getExceptionValues());
    this.#changeDetectorRef.markForCheck();
  }

  protected toggleCollapsed(): void {
    this.#isCollapsed.update(collapsed => !collapsed);
  }

  protected addException(): void {
    this.exceptionsForm.push(
      this.#formBuilder.nonNullable.control<QuickSetupDayExceptionValue>({
        calendarDays: [],
        dates: [''],
        key: this.#nextRowKey('day-exception'),
        selectedSessionTypeIds: [...this.selectedSessionTypeIds()],
      }),
    );
    this.#onTouched?.();
  }

  protected removeException(index: number): void {
    this.exceptionsForm.removeAt(index);
    this.#onTouched?.();
  }

  #collectCardValidationDetails(): QuickSetupDayExceptionValidationErrorDetail[] {
    return this.exceptionsForm.controls.map(control => {
      const cardDetail = control.errors?.[CARD_EXCEPTION_DETAIL_ERROR_KEY] as QuickSetupDayExceptionValidationErrorDetail | undefined;

      return cardDetail ?? { dates: [], selectedSessionTypeIds: null };
    });
  }

  #nextRowKey(prefix: string): string {
    this.#keySeed += 1;

    return `${prefix}-${this.#keySeed}`;
  }

  #getExceptionValues(): QuickSetupDayExceptionValue[] {
    return this.exceptionsForm.controls
      .map(control => control.getRawValue())
      .filter((value): value is QuickSetupDayExceptionValue => value !== null);
  }

  #publishValueChange(markTouched = false): void {
    const value = this.#getExceptionValues();
    const serialized = this.#serialize(value);

    if (serialized === this.#lastEmittedValue) {
      return;
    }

    this.#lastEmittedValue = serialized;

    if (markTouched) {
      this.#onTouched?.();
    }

    this.#onChange?.(value);
    this.#onValidatorChange?.();
  }

  #serialize(value: QuickSetupDayExceptionValue[]): string {
    return JSON.stringify(
      value.map(exception => [
        exception.key,
        exception.dates,
        exception.selectedSessionTypeIds,
        exception.calendarDays.map(day => [
          day.specificDate,
          day.weekDayName,
          day.timeSlots.map(slot => [slot.time, slot.tierId, slot.isVisible, slot.disabled]),
        ]),
      ]),
    );
  }
}
