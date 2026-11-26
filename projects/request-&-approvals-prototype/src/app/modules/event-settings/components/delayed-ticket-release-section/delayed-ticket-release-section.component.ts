import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { DurationUnit } from '@fz-original/app/shared/ticket-delivery-settings/models/duration-unit.enum';
import { TicketDeliverySettingsRule } from '@fz-original/app/shared/ticket-delivery-settings/models/ticket-delivery-settings.model';
import { getTimezoneFromRule } from '@fz-original/app/shared/ticket-delivery-settings/ticket-delivery-settings.utils';
import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntNativeDateInputComponent } from '@ignite/legacy/components/ignt-native-date-input/ignt-native-date-input.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, map, merge as rxMerge, startWith, switchMap } from 'rxjs';

import { DelayedTicketReleaseFormGroup } from './delayed-ticket-release-section.types';
import { syncDelayedTicketReleaseValidators } from './delayed-ticket-release-section.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntFieldErrorComponent,
    IgntInputFieldComponent,
    IgntNativeDateInputComponent,
    IgntRadioComponent,
    IgntToggleComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    TranslateModule,
    IgntWrapperCardComponent,
  ],
  selector: 'app-delayed-ticket-release-section',
  standalone: true,
  styleUrl: './delayed-ticket-release-section.component.scss',
  templateUrl: './delayed-ticket-release-section.component.html',
})
export class DelayedTicketReleaseSectionComponent {
  readonly formGroup = input.required<DelayedTicketReleaseFormGroup>();
  readonly planId = input.required<number>();
  readonly canEditPlan = input<boolean>(true);
  readonly fallbackFirstActiveTimeSlot = input<string | null>(null);
  readonly fallbackTimezone = input<string>('');
  readonly onFormDirtyChange = input<((dirty: boolean) => void) | undefined>(undefined);
  readonly planName = input<string>('');
  readonly rule = input<TicketDeliverySettingsRule | null>(null);

  readonly #translate = inject(TranslateService);

  protected readonly planTimezone = computed<string>(() => getTimezoneFromRule(this.rule(), this.fallbackTimezone()));

  protected readonly sharedPlanNames = computed<string[]>(() => {
    const mainPlans = this.rule()?.ticketDeliverySettings.mainPlans ?? [];
    const otherPlans = mainPlans.filter(plan => plan.id !== this.planId());
    return otherPlans.length > 0 ? otherPlans.map(plan => plan.name) : [];
  });

  protected readonly isEditingName = signal(false);

  protected readonly releaseDatetimeSnapshot = toSignal(
    toObservable(this.formGroup).pipe(
      switchMap(fg => {
        const control = fg.controls.releaseDatetime;
        return rxMerge(control.statusChanges, control.valueChanges).pipe(
          startWith(null),
          map(() => ({ errors: control.errors, touched: control.touched })),
        );
      }),
    ),
  );

  protected readonly releaseDatetimeErrorMessage = computed<string>(() => {
    const snapshot = this.releaseDatetimeSnapshot();
    if (!snapshot?.errors) {
      return '';
    }
    if (snapshot.errors['noActiveTimeSlot']) {
      return this.#translate.instant('eventSettings.delayedTicketRelease.validation.noActiveTimeSlot');
    }
    if (snapshot.errors['releaseBeforeEvent']) {
      return this.#translate.instant('eventSettings.delayedTicketRelease.validation.releaseBeforeEvent');
    }
    if (snapshot.errors['pastTrigger']) {
      return this.#translate.instant('eventSettings.delayedTicketRelease.validation.pastTrigger');
    }
    if (snapshot.errors['releaseBeforeReminder']) {
      return this.#translate.instant('eventSettings.delayedTicketRelease.validation.releaseBeforeReminder');
    }
    if (snapshot.errors['required'] && snapshot.touched) {
      return this.#translate.instant('eventSettings.delayedTicketRelease.validation.enterValidTime');
    }
    return '';
  });

  protected readonly releaseDatetimeHasError = computed<boolean>(() => this.releaseDatetimeErrorMessage() !== '');

  protected readonly durationUnitOptions = computed(() => [
    { id: DurationUnit.MINUTES, title: this.#translate.instant('eventSettings.delayedTicketRelease.releaseTiming.unitMinutes') },
    { id: DurationUnit.HOURS, title: this.#translate.instant('eventSettings.delayedTicketRelease.releaseTiming.unitHours') },
    { id: DurationUnit.DAYS, title: this.#translate.instant('eventSettings.delayedTicketRelease.releaseTiming.unitDays') },
  ]);

  protected readonly selectedDurationUnit = toSignal(
    toObservable(this.formGroup).pipe(
      switchMap(fg => fg.controls.durationUnit.valueChanges.pipe(startWith(fg.controls.durationUnit.value))),
      map(value => this.durationUnitOptions().find(opt => opt.id === value)),
      distinctUntilChanged(),
    ),
  );

  protected readonly enabled = toSignal<boolean, boolean>(
    toObservable(this.formGroup).pipe(
      switchMap(fg => fg.controls.enabled.valueChanges.pipe(startWith(fg.controls.enabled.value))),
      distinctUntilChanged(),
    ),
    { initialValue: false },
  );

  protected readonly releaseTimingEnabled = toSignal<boolean, boolean>(
    toObservable(this.formGroup).pipe(
      switchMap(fg => fg.controls.releaseTimingEnabled.valueChanges.pipe(startWith(fg.controls.releaseTimingEnabled.value))),
      distinctUntilChanged(),
    ),
    { initialValue: true },
  );

  protected readonly releaseMode = toSignal<'ONE_TIME' | 'PER_TIME_SLOT', 'ONE_TIME' | 'PER_TIME_SLOT'>(
    toObservable(this.formGroup).pipe(
      switchMap(fg => fg.controls.releaseMode.valueChanges.pipe(startWith(fg.controls.releaseMode.value))),
      distinctUntilChanged(),
    ),
    { initialValue: 'ONE_TIME' },
  );

  protected readonly releaseDatetime = toSignal<string, string>(
    toObservable(this.formGroup).pipe(
      switchMap(fg => fg.controls.releaseDatetime.valueChanges.pipe(startWith(fg.controls.releaseDatetime.value))),
    ),
    { initialValue: '' },
  );

  protected readonly isSeatingBlocked = toSignal<boolean, boolean>(
    toObservable(this.formGroup).pipe(
      switchMap(fg => fg.controls.isSeatingBlocked.valueChanges.pipe(startWith(fg.controls.isSeatingBlocked.value))),
      distinctUntilChanged(),
    ),
    { initialValue: false },
  );

  protected readonly ruleName = toSignal<string, string>(
    toObservable(this.formGroup).pipe(switchMap(fg => fg.controls.ruleName.valueChanges.pipe(startWith(fg.controls.ruleName.value)))),
    { initialValue: '' },
  );

  protected readonly timezoneLabel = computed<string>(() => {
    const tz = this.planTimezone();
    if (!tz) {
      return '';
    }
    try {
      const offset =
        new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
          .formatToParts(new Date())
          .find(part => part.type === 'timeZoneName')?.value ?? '';
      return `${tz} (${offset})`;
    } catch {
      return tz;
    }
  });

  protected finishEditingName(): void {
    this.isEditingName.set(false);
  }

  protected onReleaseDatetimeBlurred(): void {
    const control = this.formGroup().controls.releaseDatetime;
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  protected onEnabledChange(event: Event): void {
    if (!this.canEditPlan()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    const fg = this.formGroup();
    fg.controls.enabled.setValue(target.checked);

    if (target.checked && !fg.controls.ruleName.value) {
      const label = this.planName() || `Plan ${this.planId()}`;
      fg.controls.ruleName.setValue(this.#translate.instant('eventSettings.delayedTicketRelease.defaultRuleName', { planName: label }));
    }

    this.#syncValidatorsAndMarkDirty();
  }

  protected onDurationUnitSelect(option: SelectOption): void {
    const fg = this.formGroup();
    fg.controls.durationUnit.setValue(option.id as DurationUnit);
    fg.controls.durationAmount.updateValueAndValidity();
    this.#markDirty();
  }

  protected onReleaseDatetimeChange(value: string): void {
    const control = this.formGroup().controls.releaseDatetime;
    control.setValue(value);
    control.markAsTouched();
    this.#markDirty();
  }

  protected onReleaseModeChange(mode: 'ONE_TIME' | 'PER_TIME_SLOT'): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.formGroup().controls.releaseMode.setValue(mode);
    this.#syncValidatorsAndMarkDirty();
  }

  protected onReleaseTimingEnabledChange(event: Event): void {
    if (!this.canEditPlan()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    this.formGroup().controls.releaseTimingEnabled.setValue(target.checked);
    this.#syncValidatorsAndMarkDirty();
  }

  protected onSeatingBlockedChange(event: Event): void {
    if (!this.canEditPlan()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    this.formGroup().controls.isSeatingBlocked.setValue(target.checked);
    this.#markDirty();
  }

  protected startEditingName(): void {
    if (this.canEditPlan()) {
      this.isEditingName.set(true);
    }
  }

  #markDirty(): void {
    this.formGroup().markAsDirty();
    this.onFormDirtyChange()?.(true);
  }

  #syncValidatorsAndMarkDirty(): void {
    syncDelayedTicketReleaseValidators(this.formGroup(), this.rule(), this.fallbackTimezone(), this.fallbackFirstActiveTimeSlot());
    this.#markDirty();
  }
}
