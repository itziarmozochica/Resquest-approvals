import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';

import { ScheduleCalendar } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { GenericOption } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-options.models';
import {
  QuickSetupScheduleFormPatchValue,
  QuickSetupScheduleFormValue,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { QuickSetupScheduleItemComponent } from '../../quick-setup-schedule-item/quick-setup-schedule-item.component';
import { buildQuickSetupScheduleCardClass } from '../../utils/quick-setup-schedule-color.util';

type OnChangeFn = (value: QuickSetupScheduleFormValue | null) => void;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    QuickSetupScheduleItemComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuickSetupScheduleCardComponent),
    },
    {
      multi: true,
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => QuickSetupScheduleCardComponent),
    },
  ],
  selector: 'app-quick-setup-schedule-card',
  styleUrl: './quick-setup-schedule-card.component.scss',
  templateUrl: './quick-setup-schedule-card.component.html',
})
export class QuickSetupScheduleCardComponent implements ControlValueAccessor, Validator {
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);

  readonly availableSessionTypeIds = input.required<number[]>();
  readonly canDeleteSchedule = input(false);
  readonly canEditScheduleName = input(true);
  readonly capacityTemplateId = input.required<string | null>();
  readonly isPricesByTier = input(false);
  readonly isScheduleNameEditLocked = input(false);
  readonly locale = input.required<string>();
  readonly testIdSuffix = input(0);
  readonly sessionTypeOptions = input.required<GenericOption[]>();
  readonly tierOptions = input.required<GenericOption[]>();
  readonly timezone = input('UTC');

  readonly calendarScrollToMonth = output<string>();
  readonly editingScheduleIndexChange = output<boolean>();
  readonly removeSchedule = output<void>();

  protected readonly scheduleItem = viewChild(QuickSetupScheduleItemComponent);
  readonly #editingScheduleNameControl = signal<FormControl<string> | null>(null);
  readonly #isCollapsed = signal(false);
  readonly #isWritingValue = signal(false);
  readonly #scheduleName = signal('');

  protected readonly editingScheduleNameControl = this.#editingScheduleNameControl.asReadonly();
  protected readonly isCollapsed = this.#isCollapsed.asReadonly();
  protected readonly scheduleItemControl = new FormControl<QuickSetupScheduleFormValue | null>(null);

  protected readonly canStartEditingScheduleName = computed(() => this.canEditScheduleName());
  protected readonly cardClass = computed(() => buildQuickSetupScheduleCardClass(this.testIdSuffix()));
  protected readonly isScheduleItemLocked = computed(() => this.isScheduleNameEditLocked());
  protected readonly scheduleName = this.#scheduleName.asReadonly();

  #onChange: OnChangeFn | undefined;
  #onTouched: (() => void) | undefined;
  #onValidatorChange: (() => void) | undefined;

  constructor() {
    this.scheduleItemControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      if (this.#isWritingValue()) {
        return;
      }

      if (value !== null) {
        this.#onChange?.(value);
      }

      this.#notifyParentValidatorChange();
    });

    this.scheduleItemControl.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (!this.#isWritingValue()) {
        this.#notifyParentValidatorChange();
      }
    });

    afterNextRender(() => {
      this.#notifyParentValidatorChange();
    });
  }

  getFormValue(): QuickSetupScheduleFormValue | null {
    return this.scheduleItem()?.getFormValue() ?? null;
  }

  getScheduleFormValue(): QuickSetupScheduleFormValue | null {
    return this.scheduleItem()?.getScheduleFormValue() ?? this.scheduleItemControl.value;
  }

  markFormAsTouched(): void {
    this.scheduleItem()?.markFormAsTouched();
    this.#onTouched?.();
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
    if (isDisabled) {
      this.scheduleItemControl.disable({ emitEvent: false });
    } else {
      this.scheduleItemControl.enable({ emitEvent: false });
    }
  }

  setSelectedSessionTypeIds(sessionTypeIds: number[]): void {
    this.scheduleItem()?.setSelectedSessionTypeIds(sessionTypeIds);
  }

  submit(): ScheduleCalendar | null {
    return this.scheduleItem()?.submit() ?? null;
  }

  validate(): ValidationErrors | null {
    const scheduleItem = this.scheduleItem();

    if (!scheduleItem) {
      return { invalidScheduleItem: true };
    }

    return scheduleItem.validate();
  }

  writeValue(value: QuickSetupScheduleFormValue | null): void {
    this.#isWritingValue.set(true);

    try {
      this.scheduleItemControl.setValue(value, { emitEvent: false });
      this.#scheduleName.set(String(value?.name ?? ''));
    } finally {
      this.#isWritingValue.set(false);
    }
  }

  protected cancelEditingScheduleName(): void {
    this.#clearNameEditState();
    this.scheduleItem()?.setDisabledState(false);
    this.editingScheduleIndexChange.emit(false);
  }

  protected saveScheduleName(): void {
    const nameControl = this.#editingScheduleNameControl();

    if (!nameControl) {
      return;
    }

    nameControl.setValue(String(nameControl.value ?? '').trim());
    nameControl.markAsTouched();
    nameControl.updateValueAndValidity();

    if (nameControl.invalid) {
      return;
    }

    const name = nameControl.value;
    const liveValue = this.scheduleItem()?.getScheduleFormValue() ?? this.scheduleItemControl.value;

    if (!liveValue) {
      return;
    }

    const updatedValue: QuickSetupScheduleFormValue = { ...liveValue, name };

    this.#clearNameEditState();
    this.scheduleItem()?.setDisabledState(false);
    this.editingScheduleIndexChange.emit(false);

    this.#isWritingValue.set(true);

    try {
      const namePatch: QuickSetupScheduleFormPatchValue = { name };

      this.scheduleItem()?.writeValue(namePatch);
      this.#scheduleName.set(name);
      this.#onChange?.(updatedValue);
      this.#onTouched?.();
      this.#notifyParentValidatorChange();
    } finally {
      this.#isWritingValue.set(false);
    }
  }

  protected toggleCollapsed(): void {
    this.#isCollapsed.update(collapsed => !collapsed);
  }

  protected startEditingScheduleName(): void {
    if (!this.canEditScheduleName()) {
      return;
    }

    this.#isCollapsed.set(false);
    this.#editingScheduleNameControl.set(
      this.#formBuilder.nonNullable.control(this.scheduleName(), [Validators.required, Validators.maxLength(255)]),
    );
    this.scheduleItem()?.setDisabledState(true);
    this.editingScheduleIndexChange.emit(true);
  }

  #clearNameEditState(): void {
    this.#editingScheduleNameControl.set(null);
  }

  #notifyParentValidatorChange(): void {
    this.#onValidatorChange?.();
  }
}
