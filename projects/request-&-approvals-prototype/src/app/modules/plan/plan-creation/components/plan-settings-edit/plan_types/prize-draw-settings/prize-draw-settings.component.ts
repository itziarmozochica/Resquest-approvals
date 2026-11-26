import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CancellationSettingsSectionComponent } from '@fz-original/app/modules/event-settings/components/cancellation-settings-section/cancellation-settings-section.component';
import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { PrizeDrawSettings } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/prize-draw/prize-draw-settings.model';
import { CancellationSettingsFacade } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/cancellation/cancellation-settings-facade';
import { CancellationSettingsSaveOutcome } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/cancellation/cancellation-settings-facade.types';
import { PrizeDrawSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/prize-draw/prize-draw-settings.service';
import { applyControlsEditability } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/form-editability';
import {
  getPlanSettingsEditability,
  getPlanSettingsStatusBannerKey,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/loyalty-plan-settings-status';
import { resolveEventTimezone } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/resolve-event-timezone.util';
import { resolveTrackedPlanName } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/resolve-tracked-plan-name.util';
import {
  hasPendingChanges,
  showNothingToChangeToast,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/show-nothing-to-change-toast.util';
import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { SearchFiltersService } from '@fz-original/app/shared/services/filters/search-filters.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { integerValidator } from '@fz-original/app/shared/validators/integer.validator';
import { IgntAlertComponent } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntNativeDateInputComponent } from '@ignite/legacy/components/ignt-native-date-input/ignt-native-date-input.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { catchError, Observable, of, tap } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionsBarComponent,
    CancellationSettingsSectionComponent,
    IgntAlertComponent,
    IgntInputFieldComponent,
    IgntNativeDateInputComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [CancellationSettingsFacade],
  selector: 'app-prize-draw-settings',
  styleUrl: './prize-draw-settings.component.scss',
  templateUrl: './prize-draw-settings.component.html',
})
export class PrizeDrawSettingsComponent implements OnInit {
  readonly cancellationSettingsFacade = inject(CancellationSettingsFacade);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #loadedPlanName = signal<string>('');
  readonly #partnerService = inject(PartnerService);
  readonly #planService = inject(PlanService);
  readonly #prizeDrawSettingsService = inject(PrizeDrawSettingsService);
  readonly #router = inject(Router);
  readonly #searchFiltersService = inject(SearchFiltersService);
  readonly #searchFiltersState = toSignal(this.#searchFiltersService.getFilters(), { initialValue: null });
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  drawEndDateErrorMessage = signal<string | null>(null);
  drawStartDateErrorMessage = signal<string | null>(null);
  eventEndDateErrorMessage = signal<string | null>(null);
  eventStartDateErrorMessage = signal<string | null>(null);
  eventTimezone = signal<string>('UTC');
  drawStatus = signal<string | null>(null);
  isSaving = signal(false);
  nowLocal = signal<string>(this.#formatForDatetimeLocal(new Date()));

  planId = input.required<number>();
  canEditPlan = input<boolean>(true);
  readonly continueToNextTab = input<(() => void) | null>(null);
  mode = input<'creation' | 'edit'>('creation');
  onFormDirtyChange = input<(dirty: boolean) => void>();
  planCreationStatus = input<PlanCreationStatusData | null>(null);
  settings = input<Partial<MainPlanSettings> | null>(null);

  prizeDrawSettingsForm: FormGroup = this.#formBuilder.group({
    drawEndsAt: [null, [Validators.required]],
    drawStartsAt: [null, [Validators.required]],
    eventEndsAt: [null, [Validators.required]],
    eventStartsAt: [null, [Validators.required]],
    pointsAmountPerParticipation: [null, [Validators.required, Validators.min(1), integerValidator]],
  });

  constructor() {
    toObservable(this.editability)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(editability => {
        applyControlsEditability(this.prizeDrawSettingsForm, {
          drawEndsAt: editability.scheduleEndDate,
          drawStartsAt: editability.scheduleStartDate,
          eventEndsAt: editability.eventDates,
          eventStartsAt: editability.eventDates,
          pointsAmountPerParticipation: editability.scheduleEndDate,
        });
      });
  }

  get drawEndsAtMin(): string {
    return this.prizeDrawSettingsForm.get('drawStartsAt')?.value ?? '';
  }

  get drawStartsAtMin(): string {
    return this.nowLocal();
  }

  get eventEndsAtMin(): string {
    const eventStart = this.prizeDrawSettingsForm.get('eventStartsAt')?.value ?? '';
    const drawEnd = this.prizeDrawSettingsForm.get('drawEndsAt')?.value ?? '';
    return this.#getLaterOfTwoDateStrings(eventStart, drawEnd);
  }

  editability = computed(() => getPlanSettingsEditability(this.canEditPlan(), this.drawStatus()));

  statusBannerDescriptionKey = computed(() => getPlanSettingsStatusBannerKey('prizeDraw', this.drawStatus()));
  showStatusBanner = computed(() => this.statusBannerDescriptionKey() !== null);
  statusBannerDescription = computed(() => {
    const statusBannerKey = this.statusBannerDescriptionKey();
    return statusBannerKey ? this.#translateService.instant(statusBannerKey) : '';
  });

  isAnyFieldEditable = computed(() => this.editability().anyField);
  isDrawEndDateEditable = computed(() => this.editability().scheduleEndDate);
  isDrawStartDateEditable = computed(() => this.editability().scheduleStartDate);
  isEventDatesEditable = computed(() => this.editability().eventDates);
  isPointsEditable = computed(() => this.editability().scheduleEndDate);

  get eventStartsAtMin(): string {
    return this.prizeDrawSettingsForm.get('drawStartsAt')?.value ?? '';
  }

  get hasAnyError(): boolean {
    return !!(
      this.eventStartDateErrorMessage() ||
      this.eventEndDateErrorMessage() ||
      this.drawStartDateErrorMessage() ||
      this.drawEndDateErrorMessage()
    );
  }

  get hasPendingChanges(): boolean {
    return hasPendingChanges([this.prizeDrawSettingsForm.dirty, this.cancellationSettingsFacade.isDirty]);
  }

  ngOnInit(): void {
    this.#loadPlanTimezone();
    this.cancellationSettingsFacade.initialize(this.settings());
    this.#subscribeToFormDirtyState();
  }

  onConfirm(): void {
    if (!this.editability().anyField || this.isSaving()) {
      return;
    }
    if (this.mode() === 'edit' && !this.hasPendingChanges) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }
    const navigateOnSuccess = this.mode() === 'creation';
    const successMessageKey = this.mode() === 'edit' ? 'eventSettings.successMessage' : 'planSettings.success.settingsSaved';
    this.#saveSettings(navigateOnSuccess, successMessageKey);
  }

  onDrawEndsAtBlur(): void {
    this.#onDateBlur('drawEndsAt', () => {
      this.#validateDrawEndDate();
      this.#validateEventEndDate();
    });
  }

  onDrawEndsAtChange(value: string): void {
    this.#applyDateChange('drawEndsAt', value, () => {
      this.#validateDrawEndDate();
      this.#validateEventEndDate();
    });
  }

  onDrawStartsAtBlur(): void {
    this.#onDateBlur('drawStartsAt', () => {
      this.#validateDrawStartDate();
      this.#validateDrawEndDate();
      this.#validateEventStartDate();
    });
  }

  onDrawStartsAtChange(value: string): void {
    this.#applyDateChange('drawStartsAt', value, () => {
      this.#validateDrawStartDate();
      this.#validateDrawEndDate();
      this.#validateEventStartDate();
    });
  }

  onEventEndsAtBlur(): void {
    this.#onDateBlur('eventEndsAt', () => this.#validateEventEndDate());
  }

  onEventEndsAtChange(value: string): void {
    this.#applyDateChange('eventEndsAt', value, () => this.#validateEventEndDate());
  }

  onEventStartsAtBlur(): void {
    this.#onDateBlur('eventStartsAt', () => {
      this.#validateEventStartDate();
      this.#validateEventEndDate();
    });
  }

  onEventStartsAtChange(value: string): void {
    this.#applyDateChange('eventStartsAt', value, () => {
      this.#validateEventStartDate();
      this.#validateEventEndDate();
    });
  }

  onPointsBlur(): void {
    const control = this.prizeDrawSettingsForm.get('pointsAmountPerParticipation');
    control?.markAsTouched();
    control?.updateValueAndValidity();
  }

  onSaveDraft(): void {
    if (!this.editability().anyField || this.isSaving()) {
      return;
    }
    if (!this.hasPendingChanges) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }
    this.#saveSettings(false, 'planSettings.success.draftSaved');
  }

  #applyDateChange(controlName: string, value: string, afterValidate: () => void): void {
    const control = this.prizeDrawSettingsForm.get(controlName);
    if (control) {
      control.setValue(value);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
    }
    afterValidate();
  }

  #buildSettings(): PrizeDrawSettings {
    const formValue = this.prizeDrawSettingsForm.getRawValue();
    return {
      drawEndsAt: formValue.drawEndsAt ? new Date(this.#localToUtcIso(formValue.drawEndsAt)!) : null,
      drawStartsAt: formValue.drawStartsAt ? new Date(this.#localToUtcIso(formValue.drawStartsAt)!) : null,
      eventEndsAt: formValue.eventEndsAt ? new Date(this.#localToUtcIso(formValue.eventEndsAt)!) : null,
      eventStartsAt: formValue.eventStartsAt ? new Date(this.#localToUtcIso(formValue.eventStartsAt)!) : null,
      pointsAmountPerParticipation: this.#toNumberOrNull(formValue.pointsAmountPerParticipation, 1) ?? null,
    };
  }

  #formatForDatetimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  #getLaterOfTwoDateStrings(first: string, second: string): string {
    return second > first ? second : first;
  }

  #loadPlanTimezone(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      this.#loadPrizeDrawSettings();
      return;
    }
    this.#planService
      .getPlan(partner.id, this.planId())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.eventTimezone.set('UTC');
          this.#updateNowLocal();
          this.#loadPrizeDrawSettings();
        },
        next: plan => {
          this.#loadedPlanName.set(plan.data?.name?.trim() ?? '');
          this.eventTimezone.set(resolveEventTimezone(plan.data));
          this.#updateNowLocal();
          this.#loadPrizeDrawSettings();
        },
      });
  }

  #loadPrizeDrawSettings(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return;
    }
    this.#prizeDrawSettingsService
      .getPrizeDrawSettings(partner.id, this.planId())
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        tap((settings: PrizeDrawSettings | null) => {
          this.drawStatus.set(settings?.status ?? null);
          if (settings !== null) {
            const timezone = this.eventTimezone();
            const eventStartsAtLocal = settings.eventStartsAt != null ? this.#utcToLocal(settings.eventStartsAt, timezone) : null;
            const eventEndsAtLocal = settings.eventEndsAt != null ? this.#utcToLocal(settings.eventEndsAt, timezone) : null;
            const drawStartsAtLocal = settings.drawStartsAt != null ? this.#utcToLocal(settings.drawStartsAt, timezone) : null;
            const drawEndsAtLocal = settings.drawEndsAt != null ? this.#utcToLocal(settings.drawEndsAt, timezone) : null;

            this.prizeDrawSettingsForm.patchValue({
              drawEndsAt: drawEndsAtLocal,
              drawStartsAt: drawStartsAtLocal,
              eventEndsAt: eventEndsAtLocal,
              eventStartsAt: eventStartsAtLocal,
              pointsAmountPerParticipation: settings.pointsAmountPerParticipation ?? null,
            });

            this.#validateAll();
          }
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  #localToUtcIso(localValue: string): string | null {
    if (!localValue) return null;
    const timezone = this.eventTimezone();
    const localMoment = moment.tz(localValue, timezone);
    return localMoment.utc().toISOString();
  }

  #onDateBlur(controlName: string, validators: () => void): void {
    this.prizeDrawSettingsForm.get(controlName)?.markAsTouched();
    validators();
  }

  #onSaveOutcome(outcome: CancellationSettingsSaveOutcome, navigateOnSuccess: boolean, successMessageKey: string): void {
    this.isSaving.set(false);
    this.onFormDirtyChange()?.(this.hasPendingChanges);
    if (outcome === 'dedicatedFailed') {
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('planSettings.errors.saveFailed'),
        sentiment: AlertSentiment.danger,
      });
      return;
    }
    if (outcome === 'cancellationFailed') {
      return;
    }
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant(successMessageKey),
      sentiment: AlertSentiment.positive,
    });
    const continueToNextTab = this.continueToNextTab();
    if (navigateOnSuccess && continueToNextTab) {
      continueToNextTab();
    } else if (navigateOnSuccess) {
      this.#router.navigate(['/plans/dashboard', this.planId()]);
    }
  }

  #saveSettings(navigateOnSuccess: boolean, successMessageKey: string): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return;
    }

    this.prizeDrawSettingsForm.markAllAsTouched();
    this.#validateAll();

    if (this.prizeDrawSettingsForm.invalid || this.hasAnyError || this.cancellationSettingsFacade.isInvalid) {
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('planSettings.errors.requiredFields'),
        sentiment: AlertSentiment.danger,
      });
      return;
    }

    this.isSaving.set(true);
    const dedicatedSave$: Observable<PrizeDrawSettings> | null =
      navigateOnSuccess || this.prizeDrawSettingsForm.dirty
        ? this.#prizeDrawSettingsService
            .savePrizeDrawSettings(partner.id, this.planId(), this.#buildSettings())
            .pipe(tap(() => this.prizeDrawSettingsForm.markAsPristine()))
        : null;
    this.cancellationSettingsFacade
      .persist(partner.id, this.planId(), dedicatedSave$, {
        mode: this.mode(),
        planName: resolveTrackedPlanName(this.planId(), this.#searchFiltersState()?.selectedPlan, this.#loadedPlanName()),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((outcome: CancellationSettingsSaveOutcome) => this.#onSaveOutcome(outcome, navigateOnSuccess, successMessageKey));
  }

  #subscribeToFormDirtyState(): void {
    const callback = this.onFormDirtyChange();
    if (!callback) {
      return;
    }
    this.prizeDrawSettingsForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      callback(this.hasPendingChanges);
    });
  }

  #toNumberOrNull(value: unknown, minValue: number | null = null): number | null {
    if (value === null || value === '' || value === undefined) {
      return null;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return null;
    }
    if (minValue !== null && num < minValue) {
      return minValue;
    }
    return num;
  }

  #updateNowLocal(): void {
    this.nowLocal.set(moment.tz(this.eventTimezone()).format('YYYY-MM-DDTHH:mm'));
  }

  #utcToLocal(isoString: string | Date, timezone: string): string {
    const m = moment.utc(isoString).tz(timezone);
    return m.format('YYYY-MM-DDTHH:mm');
  }

  #validateAll(): void {
    this.#validateDrawStartDate();
    this.#validateDrawEndDate();
    this.#validateEventStartDate();
    this.#validateEventEndDate();
    const pointsControl = this.prizeDrawSettingsForm.get('pointsAmountPerParticipation');
    if (pointsControl?.touched) {
      pointsControl.updateValueAndValidity();
    }
  }

  #validateDateIsAfter(
    controlName: string,
    errorMessageSignal: WritableSignal<string | null>,
    errorKey: string,
    formError: string,
    referenceLocal: string,
  ): void {
    const control = this.prizeDrawSettingsForm.get(controlName);
    const localValue = control?.value;

    if (!localValue) {
      if (control?.touched) {
        errorMessageSignal.set(this.#translateService.instant('common.requiredField'));
      } else {
        errorMessageSignal.set(null);
      }
      return;
    }

    if (localValue <= referenceLocal) {
      errorMessageSignal.set(this.#translateService.instant(`planSettings.prizeDraw.errors.${errorKey}`));
      control?.setErrors({ ...control.errors, [formError]: true });
    } else {
      errorMessageSignal.set(null);
      if (control?.errors?.[formError]) {
        const errors = { ...control.errors };
        delete errors[formError];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }

  #validateDrawEndDate(): void {
    this.#validateDateIsAfter('drawEndsAt', this.drawEndDateErrorMessage, 'endDateAfterStart', 'endDateBeforeStart', this.drawEndsAtMin);
  }

  #validateDrawStartDate(): void {
    if (!this.editability().scheduleStartDate) {
      this.drawStartDateErrorMessage.set(null);
      const control = this.prizeDrawSettingsForm.get('drawStartsAt');
      if (control?.errors?.['dateInPast']) {
        const errors = { ...control.errors };
        delete errors['dateInPast'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      return;
    }

    this.#validateDateIsAfter('drawStartsAt', this.drawStartDateErrorMessage, 'startDateFuture', 'dateInPast', this.drawStartsAtMin);
  }

  #validateEventEndDate(): void {
    this.#validateDateIsAfter(
      'eventEndsAt',
      this.eventEndDateErrorMessage,
      'eventEndAfterStartAndDrawEnd',
      'eventEndBeforeStartOrDrawEnd',
      this.eventEndsAtMin,
    );
  }

  #validateEventStartDate(): void {
    this.#validateDateIsAfter(
      'eventStartsAt',
      this.eventStartDateErrorMessage,
      'eventStartInFutureAndAfterDrawStart',
      'eventStartBeforeDrawStart',
      this.eventStartsAtMin,
    );
  }
}
