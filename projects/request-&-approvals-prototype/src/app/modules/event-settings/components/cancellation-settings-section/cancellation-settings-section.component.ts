import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';

import { FormInputFieldValue } from '@fz-original/app/app/models/html-tag.model';
import { IgntSwitchComponent } from '@ignite/common';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs';

import { CancellationSettingsSectionConfig } from '../../models/settings-configs.model';
import { CANCELLATION_HOURS_ERROR_MESSAGE_KEYS, CANCELLATION_HOURS_MIN } from './cancellation-settings-section.constants';
import { CancellationHoursError, CancellationSettingsFormHost } from './cancellation-settings-section.types';
import { getCancellationHoursError, toCancellationHours, validateCancellationHours } from './cancellation-settings-section.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntFieldErrorComponent,
    IgntInputFieldComponent,
    IgntSwitchComponent,
    IgntWrapperCardComponent,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-cancellation-settings-section',
  styleUrl: './cancellation-settings-section.component.scss',
  templateUrl: './cancellation-settings-section.component.html',
})
export class CancellationSettingsSectionComponent {
  readonly form = input.required<CancellationSettingsFormHost>();
  readonly canEditPlan = input<boolean>(true);
  readonly config = input<CancellationSettingsSectionConfig | null>(null);
  readonly onFormDirtyChange = input<((dirty: boolean) => void) | undefined>(undefined);
  readonly withCard = input<boolean>(true);

  readonly #destroyRef = inject(DestroyRef);

  protected readonly canEditHours = computed<boolean>(
    () => this.canEditPlan() && (this.config()?.hoursBeforeSessionCancellationNotAllowed.editable ?? false),
  );

  protected readonly canEditToggle = computed<boolean>(
    () => this.canEditPlan() && (this.config()?.allowTicketCancellations.editable ?? false),
  );

  protected readonly enabled = toSignal<boolean, boolean>(
    toObservable(this.form).pipe(
      switchMap((form: CancellationSettingsFormHost) =>
        form.controls.allowTicketCancellations.valueChanges.pipe(startWith(form.controls.allowTicketCancellations.value)),
      ),
      distinctUntilChanged(),
    ),
    { initialValue: false },
  );

  protected readonly hoursInputControl = new FormControl<FormInputFieldValue | null>(null, { validators: [validateCancellationHours] });

  protected readonly hoursInputError = toSignal<CancellationHoursError | null, null>(
    this.hoursInputControl.statusChanges.pipe(
      startWith(this.hoursInputControl.status),
      map(() => getCancellationHoursError(this.hoursInputControl.errors)),
      distinctUntilChanged(),
    ),
    { initialValue: null },
  );

  protected readonly hoursErrorMessageKey = computed<string | null>(() => {
    const error = this.hoursInputError();
    return error === null ? null : CANCELLATION_HOURS_ERROR_MESSAGE_KEYS[error];
  });

  protected readonly hoursMin = CANCELLATION_HOURS_MIN;

  constructor() {
    toObservable(this.form)
      .pipe(
        switchMap((form: CancellationSettingsFormHost) => {
          const hoursControl = form.controls.hoursBeforeSessionCancellationNotAllowed;
          return hoursControl.valueChanges.pipe(startWith(hoursControl.value));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((hours: number | null) => {
        if (!Object.is(toCancellationHours(this.hoursInputControl.value), hours)) {
          this.hoursInputControl.setValue(hours);
        }
      });

    effect(() => {
      const canEditHours = this.canEditHours();
      untracked(() => {
        if (canEditHours) {
          this.hoursInputControl.enable();
        } else {
          this.hoursInputControl.disable();
        }
      });
    });
  }

  protected onHoursInput(): void {
    if (!this.canEditHours()) {
      return;
    }
    const hoursControl = this.form().controls.hoursBeforeSessionCancellationNotAllowed;
    const hours = toCancellationHours(this.hoursInputControl.value);
    if (Object.is(hoursControl.value, hours)) {
      return;
    }
    hoursControl.setValue(hours);
    this.#markDirty(hoursControl);
  }

  protected onToggleChange(checked: boolean): void {
    if (!this.canEditToggle()) {
      return;
    }
    const toggleControl = this.form().controls.allowTicketCancellations;
    toggleControl.setValue(checked);
    this.#markDirty(toggleControl);
  }

  #markDirty(control: AbstractControl): void {
    control.markAsDirty();
    this.onFormDirtyChange()?.(true);
  }
}
