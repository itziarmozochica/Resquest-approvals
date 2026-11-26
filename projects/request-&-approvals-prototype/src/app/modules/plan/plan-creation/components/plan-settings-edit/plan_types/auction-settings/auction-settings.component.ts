import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  input,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CancellationSettingsSectionComponent } from '@fz-original/app/modules/event-settings/components/cancellation-settings-section/cancellation-settings-section.component';
import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { AuctionSettings } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/auction/auction-settings.model';
import { AuctionSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/auction/auction-settings.service';
import { CancellationSettingsFacade } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/cancellation/cancellation-settings-facade';
import { CancellationSettingsSaveOutcome } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/cancellation/cancellation-settings-facade.types';
import { applyControlsEditability } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/form-editability';
import {
  getPlanSettingsEditability,
  getPlanSettingsStatusBannerKey,
  LoyaltyPlanSettingsStatus,
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
import { IgntAlertComponent } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntNativeDateInputComponent } from '@ignite/legacy/components/ignt-native-date-input/ignt-native-date-input.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { catchError, Observable, of, tap } from 'rxjs';

const MAX_INTEGER_VALUE = 2147483647;
const MAX_TIMEOUT_DELAY_MS = 2147483647;

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
  selector: 'app-auction-settings',
  styleUrl: './auction-settings.component.scss',
  templateUrl: './auction-settings.component.html',
})
export class AuctionSettingsComponent implements OnInit {
  readonly cancellationSettingsFacade = inject(CancellationSettingsFacade);
  readonly #auctionSettingsService = inject(AuctionSettingsService);
  #auctionStartElapsed = signal(false);
  #auctionStartLockTimeoutId: ReturnType<typeof setTimeout> | null = null;
  readonly #destroyRef = inject(DestroyRef);
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #formBuilder = inject(FormBuilder);
  #lastValidBidValues: Record<string, number | null> = {};
  readonly #loadedPlanName = signal<string>('');
  readonly #partnerService = inject(PartnerService);
  readonly #planService = inject(PlanService);
  readonly #router = inject(Router);
  readonly #searchFiltersService = inject(SearchFiltersService);
  readonly #searchFiltersState = toSignal(this.#searchFiltersService.getFilters(), { initialValue: null });
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  auctionSettingsForm: FormGroup = this.#formBuilder.group(
    {
      auctionEndsAt: [null, [Validators.required]],
      auctionStartsAt: [null, [Validators.required]],
      eventEndsAt: [null, [Validators.required]],
      eventStartsAt: [null, [Validators.required]],
      maximumBidIncrement: [null],
      minimumBidIncrement: [null, [Validators.required]],
      startingBidAmount: [null],
    },
    { validators: this.#maxBidIncrementValidator() },
  );
  auctionEndDateErrorMessage = signal<string | null>(null);
  auctionEndsAtLocal = signal<string>('');
  auctionStartDateErrorMessage = signal<string | null>(null);
  auctionStartsAtLocal = signal<string>('');
  auctionStartsAtPersisted = signal<string | null>(null);
  eventEndDateErrorMessage = signal<string | null>(null);
  eventEndsAtLocal = signal<string>('');
  eventStartDateErrorMessage = signal<string | null>(null);
  eventStartsAtLocal = signal<string>('');
  eventTimezone = signal<string>('UTC');
  auctionStatus = signal<string | null>(null);
  hasAuctionEndDateError = signal(false);
  hasAuctionStartDateError = signal(false);
  hasEventEndDateError = signal(false);
  hasEventStartDateError = signal(false);
  isSaving = signal(false);
  minDateTimeLocal = signal<string>(this.#formatForDatetimeLocal(new Date()));
  canEditPlan = input<boolean>(true);
  readonly continueToNextTab = input<(() => void) | null>(null);
  @Input() mode: 'creation' | 'edit' = 'creation';
  @Input() onFormDirtyChange?: (dirty: boolean) => void;
  @Input({ required: true }) planId!: number;
  @Input() planCreationStatus: PlanCreationStatusData | null = null;
  @Input() settings: Partial<MainPlanSettings> | null = null;

  hasAuctionStarted = computed(() => {
    if (this.auctionStartsAtPersisted() === null) {
      return false;
    }
    return this.#auctionStartElapsed();
  });

  editability = computed(() => getPlanSettingsEditability(this.canEditPlan(), this.auctionStatus(), this.hasAuctionStarted()));

  statusBannerDescriptionKey = computed(() => getPlanSettingsStatusBannerKey('auction', this.auctionStatus(), this.hasAuctionStarted()));
  showStatusBanner = computed(() => this.statusBannerDescriptionKey() !== null);
  statusBannerDescription = computed(() => {
    const statusBannerKey = this.statusBannerDescriptionKey();
    return statusBannerKey ? this.#translateService.instant(statusBannerKey) : '';
  });

  isAnyFieldEditable = computed(() => this.editability().anyField);
  isAuctionEndDateEditable = computed(() => this.editability().scheduleEndDate);
  isAuctionStartDateEditable = computed(() => this.editability().scheduleStartDate);
  isBidFieldsEditable = computed(() => this.editability().scheduleEndDate);
  isEventDatesEditable = computed(() => this.editability().eventDates);

  constructor() {
    toObservable(this.editability)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(editability => {
        applyControlsEditability(this.auctionSettingsForm, {
          auctionEndsAt: editability.scheduleEndDate,
          auctionStartsAt: editability.scheduleStartDate,
          eventEndsAt: editability.eventDates,
          eventStartsAt: editability.eventDates,
          maximumBidIncrement: editability.scheduleEndDate,
          minimumBidIncrement: editability.scheduleEndDate,
          startingBidAmount: editability.scheduleEndDate,
        });
      });

    this.#destroyRef.onDestroy(() => this.#clearAuctionStartLockTimeout());
  }

  getAuctionEndsAtMin(): string {
    const startDate = this.auctionStartsAtLocal();
    const minDate = this.minDateTimeLocal();

    if (!startDate) return minDate;

    return startDate > minDate ? startDate : minDate;
  }

  getEventEndsAtMin(): string {
    const eventStartDate = this.eventStartsAtLocal();
    const auctionEndDate = this.auctionEndsAtLocal();
    const minDate = this.minDateTimeLocal();

    const candidates = [minDate];
    if (eventStartDate) candidates.push(eventStartDate);
    if (auctionEndDate) candidates.push(auctionEndDate);

    return candidates.reduce((max, current) => (current > max ? current : max), minDate);
  }

  getEventStartsAtMin(): string {
    const auctionStartDate = this.auctionStartsAtLocal();
    const minDate = this.minDateTimeLocal();

    if (!auctionStartDate) return minDate;

    return auctionStartDate > minDate ? auctionStartDate : minDate;
  }

  get hasPendingChanges(): boolean {
    return hasPendingChanges([this.auctionSettingsForm.dirty, this.cancellationSettingsFacade.isDirty]);
  }

  ngOnInit(): void {
    this.#loadPlanTimezone();
    this.cancellationSettingsFacade.initialize(this.settings);
    this.#setupMinValueRestriction();
    this.#subscribeToFormDirtyState();
  }

  onAuctionEndsAtBlur(): void {
    this.auctionSettingsForm.get('auctionEndsAt')?.markAsTouched();
    this.#validateAuctionEndDate();
  }

  onAuctionEndsAtChange(value: string): void {
    this.auctionEndsAtLocal.set(value);

    const isoValue = this.#localToUtcIso(value);
    const control = this.auctionSettingsForm.get('auctionEndsAt');
    if (control) {
      control.setValue(isoValue);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
    }
    this.#validateAuctionEndDate();
    this.#validateEventStartDate();
    this.#validateEventEndDate();
  }

  onAuctionStartsAtBlur(): void {
    this.auctionSettingsForm.get('auctionStartsAt')?.markAsTouched();
    this.#validateAuctionStartDate();
    this.#validateAuctionEndDate();
  }

  onAuctionStartsAtChange(value: string): void {
    this.auctionStartsAtLocal.set(value);

    const isoValue = this.#localToUtcIso(value);
    const control = this.auctionSettingsForm.get('auctionStartsAt');
    if (control) {
      control.setValue(isoValue);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
    }
    this.#validateAuctionStartDate();
    this.#validateAuctionEndDate();
    this.#validateEventStartDate();
  }

  onConfirm(): void {
    if (!this.editability().anyField || this.isSaving()) {
      return;
    }
    if (this.mode === 'edit' && !this.hasPendingChanges) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }
    const navigateOnSuccess = this.mode === 'creation';
    const successMessageKey = this.mode === 'edit' ? 'eventSettings.successMessage' : 'planSettings.success.settingsSaved';
    this.#saveSettings(navigateOnSuccess, successMessageKey);
  }

  onEventEndsAtBlur(): void {
    this.auctionSettingsForm.get('eventEndsAt')?.markAsTouched();
    this.#validateEventEndDate();
  }

  onEventEndsAtChange(value: string): void {
    this.eventEndsAtLocal.set(value);

    const isoValue = this.#localToUtcIso(value);
    const control = this.auctionSettingsForm.get('eventEndsAt');
    if (control) {
      control.setValue(isoValue);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
    }
    this.#validateEventEndDate();
  }

  onEventStartsAtBlur(): void {
    this.auctionSettingsForm.get('eventStartsAt')?.markAsTouched();
    this.#validateEventStartDate();
    this.#validateEventEndDate();
  }

  onEventStartsAtChange(value: string): void {
    this.eventStartsAtLocal.set(value);

    const isoValue = this.#localToUtcIso(value);
    const control = this.auctionSettingsForm.get('eventStartsAt');
    if (control) {
      control.setValue(isoValue);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
    }
    this.#validateEventStartDate();
    this.#validateEventEndDate();
  }

  onMinimumBidIncrementBlur(): void {
    this.auctionSettingsForm.get('minimumBidIncrement')?.updateValueAndValidity();
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

  #armAuctionStartLock(): void {
    this.#clearAuctionStartLockTimeout();

    const auctionStartsAtIso = this.auctionStartsAtPersisted();
    if (auctionStartsAtIso === null || this.auctionStatus() !== LoyaltyPlanSettingsStatus.Active) {
      this.#auctionStartElapsed.set(false);
      return;
    }

    const millisecondsUntilStart = moment.utc(auctionStartsAtIso).diff(moment());
    if (millisecondsUntilStart <= 0) {
      this.#auctionStartElapsed.set(true);
      return;
    }

    this.#auctionStartElapsed.set(false);
    const delay = Math.min(millisecondsUntilStart, MAX_TIMEOUT_DELAY_MS);
    this.#auctionStartLockTimeoutId = setTimeout(() => {
      this.#auctionStartLockTimeoutId = null;
      if (delay >= millisecondsUntilStart) {
        this.#auctionStartElapsed.set(true);
      } else {
        this.#armAuctionStartLock();
      }
    }, delay);
  }

  #buildSettings(): AuctionSettings {
    const formValue = this.auctionSettingsForm.getRawValue();

    const auctionStartsAtValue = this.editability().scheduleStartDate ? formValue.auctionStartsAt : this.auctionStartsAtPersisted();

    return {
      auctionEndsAt: formValue.auctionEndsAt ? new Date(formValue.auctionEndsAt) : null,
      auctionStartsAt: auctionStartsAtValue ? new Date(auctionStartsAtValue) : null,
      eventEndsAt: formValue.eventEndsAt ? new Date(formValue.eventEndsAt) : null,
      eventStartsAt: formValue.eventStartsAt ? new Date(formValue.eventStartsAt) : null,
      maximumBidIncrement: this.#toNumberOrNull(formValue.maximumBidIncrement, 1),
      minimumBidIncrement: this.#toNumberOrNull(formValue.minimumBidIncrement, 1),
      startingBidAmount: this.#toNumberOrNull(formValue.startingBidAmount, 1),
    };
  }

  #clearAuctionStartLockTimeout(): void {
    if (this.#auctionStartLockTimeoutId !== null) {
      clearTimeout(this.#auctionStartLockTimeoutId);
      this.#auctionStartLockTimeoutId = null;
    }
  }

  #formatForDatetimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  #isNullableValue(value: unknown): boolean {
    return value === null || value === '' || value === undefined;
  }

  #isValidPositiveInteger(value: unknown, minValue: number = 1): boolean {
    const numValue = Number(value);
    return Number.isInteger(numValue) && numValue >= minValue && numValue <= MAX_INTEGER_VALUE;
  }

  #loadAuctionSettings(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return;
    }

    this.#auctionSettingsService
      .getAuctionSettings(partner.id, this.planId)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        tap((settings: AuctionSettings | null) => {
          this.auctionStatus.set(settings?.status ?? null);
          if (settings !== null) {
            const timezone = this.eventTimezone();
            const eventStartsAtIso = settings.eventStartsAt ? moment.utc(settings.eventStartsAt).toISOString() : null;
            const eventEndsAtIso = settings.eventEndsAt ? moment.utc(settings.eventEndsAt).toISOString() : null;
            const auctionStartsAtIso = settings.auctionStartsAt ? moment.utc(settings.auctionStartsAt).toISOString() : null;
            const auctionEndsAtIso = settings.auctionEndsAt ? moment.utc(settings.auctionEndsAt).toISOString() : null;

            this.auctionStartsAtPersisted.set(auctionStartsAtIso);
            this.#armAuctionStartLock();

            const eventStartsAtLocal = eventStartsAtIso ? this.#utcToLocal(eventStartsAtIso, timezone) : '';
            const eventEndsAtLocal = eventEndsAtIso ? this.#utcToLocal(eventEndsAtIso, timezone) : '';
            const auctionStartsAtLocal = auctionStartsAtIso ? this.#utcToLocal(auctionStartsAtIso, timezone) : '';
            const auctionEndsAtLocal = auctionEndsAtIso ? this.#utcToLocal(auctionEndsAtIso, timezone) : '';

            this.auctionSettingsForm.patchValue({
              auctionEndsAt: auctionEndsAtIso,
              auctionStartsAt: auctionStartsAtIso,
              eventEndsAt: eventEndsAtIso,
              eventStartsAt: eventStartsAtIso,
              maximumBidIncrement: settings.maximumBidIncrement,
              minimumBidIncrement: settings.minimumBidIncrement,
              startingBidAmount: settings.startingBidAmount,
            });

            this.eventStartsAtLocal.set(eventStartsAtLocal);
            this.eventEndsAtLocal.set(eventEndsAtLocal);
            this.auctionStartsAtLocal.set(auctionStartsAtLocal);
            this.auctionEndsAtLocal.set(auctionEndsAtLocal);

            this.#validateAuctionStartDate();
            this.#validateAuctionEndDate();
            this.#validateEventStartDate();
            this.#validateEventEndDate();
          }
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  #loadPlanTimezone(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      this.#loadAuctionSettings();
      return;
    }

    this.#planService
      .getPlan(partner.id, this.planId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.eventTimezone.set('UTC');
          this.#updateMinDateTimeLocal();
          this.#loadAuctionSettings();
        },
        next: plan => {
          this.#loadedPlanName.set(plan.data?.name?.trim() ?? '');
          this.eventTimezone.set(resolveEventTimezone(plan.data));
          this.#updateMinDateTimeLocal();
          this.#loadAuctionSettings();
        },
      });
  }

  #localToUtcIso(localValue: string): string | null {
    if (!localValue) return null;
    const timezone = this.eventTimezone();
    const localMoment = moment.tz(localValue, timezone);
    return localMoment.utc().toISOString();
  }

  #maxBidIncrementValidator(): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const minBid = control.get('minimumBidIncrement')?.value;
      const maxBid = control.get('maximumBidIncrement')?.value;

      if (this.#isValidPositiveInteger(maxBid) && this.#isValidPositiveInteger(minBid) && Number(maxBid) < Number(minBid)) {
        control.get('maximumBidIncrement')?.setErrors({ maxLessThanMin: true });
        return { maxLessThanMin: true };
      }

      const maxBidControl = control.get('maximumBidIncrement');
      if (maxBidControl?.errors?.['maxLessThanMin']) {
        const errors = { ...maxBidControl.errors };
        delete errors['maxLessThanMin'];
        maxBidControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }

      return null;
    };
  }

  #onSaveOutcome(outcome: CancellationSettingsSaveOutcome, navigateOnSuccess: boolean, successMessageKey: string): void {
    this.isSaving.set(false);
    this.onFormDirtyChange?.(this.hasPendingChanges);
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
      this.#router.navigate(['/plans/dashboard', this.planId]);
    }
  }

  #saveSettings(navigateOnSuccess: boolean, successMessageKey: string): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return;
    }

    this.auctionSettingsForm.markAllAsTouched();
    this.#validateAuctionStartDate();
    this.#validateAuctionEndDate();
    this.#validateEventStartDate();
    this.#validateEventEndDate();

    const hasDateErrors =
      this.hasAuctionStartDateError() || this.hasAuctionEndDateError() || this.hasEventStartDateError() || this.hasEventEndDateError();

    if (this.auctionSettingsForm.invalid || hasDateErrors || this.cancellationSettingsFacade.isInvalid) {
      this.auctionSettingsForm.get('minimumBidIncrement')?.updateValueAndValidity();
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('planSettings.errors.requiredFields'),
        sentiment: AlertSentiment.danger,
      });
      return;
    }

    this.isSaving.set(true);
    const payload = this.#buildSettings();
    const dedicatedSave$: Observable<AuctionSettings> | null =
      navigateOnSuccess || this.auctionSettingsForm.dirty
        ? this.#auctionSettingsService.saveAuctionSettings(partner.id, this.planId, payload).pipe(
            tap(() => {
              this.auctionStartsAtPersisted.set(payload.auctionStartsAt ? moment.utc(payload.auctionStartsAt).toISOString() : null);
              this.#armAuctionStartLock();
              this.auctionSettingsForm.markAsPristine();
            }),
          )
        : null;
    this.cancellationSettingsFacade
      .persist(partner.id, this.planId, dedicatedSave$, {
        mode: this.mode,
        planName: resolveTrackedPlanName(this.planId, this.#searchFiltersState()?.selectedPlan, this.#loadedPlanName()),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((outcome: CancellationSettingsSaveOutcome) => this.#onSaveOutcome(outcome, navigateOnSuccess, successMessageKey));
  }

  #setDateTimeError(message: string, errorMessage: WritableSignal<string | null>, hasError: WritableSignal<boolean>): void {
    errorMessage.set(message);
    hasError.set(true);
  }

  #setFormValue(fieldName: string, value: number | null): void {
    this.auctionSettingsForm.get(fieldName)?.setValue(value, { emitEvent: false });
  }

  #setupMinValueRestriction(): void {
    const bidFields: Record<string, string> = {
      maximumBidIncrement: 'auction-maximum-bid-increment',
      minimumBidIncrement: 'auction-minimum-bid-increment',
      startingBidAmount: 'auction-starting-bid',
    };

    Object.entries(bidFields).forEach(([fieldName, inputId]) => {
      this.#lastValidBidValues[fieldName] = this.auctionSettingsForm.get(fieldName)?.value ?? null;

      this.auctionSettingsForm
        .get(fieldName)
        ?.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(value => {
          const inputElement = this.#elementRef.nativeElement.querySelector(`input#${inputId}`) as HTMLInputElement | null;
          if (inputElement?.validity?.badInput) {
            setTimeout(() => this.#setFormValue(fieldName, this.#lastValidBidValues[fieldName]));
            return;
          }

          if (this.#isNullableValue(value)) {
            this.#lastValidBidValues[fieldName] = null;
            return;
          }

          const clampedValue = Math.max(1, Math.min(Math.floor(Number(value)), MAX_INTEGER_VALUE));
          if (clampedValue !== Number(value)) {
            setTimeout(() => this.#setFormValue(fieldName, clampedValue));
          }
          this.#lastValidBidValues[fieldName] = clampedValue;
        });
    });
  }

  #subscribeToFormDirtyState(): void {
    if (!this.onFormDirtyChange) {
      return;
    }
    this.auctionSettingsForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.onFormDirtyChange?.(this.hasPendingChanges);
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

  #updateMinDateTimeLocal(): void {
    this.minDateTimeLocal.set(moment.tz(this.eventTimezone()).format('YYYY-MM-DDTHH:mm'));
  }

  #utcToLocal(isoString: string, timezone: string): string {
    const m = moment.utc(isoString).tz(timezone);
    return m.format('YYYY-MM-DDTHH:mm');
  }

  #validateAuctionEndDate(): void {
    const auctionEndsAtIso = this.auctionSettingsForm.get('auctionEndsAt')?.value;
    const auctionStartsAtIso = this.auctionSettingsForm.get('auctionStartsAt')?.value;
    const auctionEndsAtControl = this.auctionSettingsForm.get('auctionEndsAt');

    if (!auctionEndsAtIso) {
      if (auctionEndsAtControl?.touched) {
        this.#setDateTimeError(
          this.#translateService.instant('common.requiredField'),
          this.auctionEndDateErrorMessage,
          this.hasAuctionEndDateError,
        );
      } else {
        this.auctionEndDateErrorMessage.set(null);
        this.hasAuctionEndDateError.set(false);
      }
      return;
    }

    if (auctionStartsAtIso) {
      const startMoment = moment.utc(auctionStartsAtIso);
      const endMoment = moment.utc(auctionEndsAtIso);

      if (endMoment.isSameOrBefore(startMoment)) {
        this.#setDateTimeError(
          this.#translateService.instant('planSettings.auction.errors.auctionEndDateAfterStart'),
          this.auctionEndDateErrorMessage,
          this.hasAuctionEndDateError,
        );
        auctionEndsAtControl?.setErrors({ endDateBeforeStart: true });
        return;
      }
    }

    this.auctionEndDateErrorMessage.set(null);
    this.hasAuctionEndDateError.set(false);
    if (auctionEndsAtControl?.errors?.['endDateBeforeStart']) {
      const errors = { ...auctionEndsAtControl.errors };
      delete errors['endDateBeforeStart'];
      auctionEndsAtControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }

  #validateAuctionStartDate(): void {
    if (!this.editability().scheduleStartDate) {
      this.auctionStartDateErrorMessage.set(null);
      this.hasAuctionStartDateError.set(false);
      const control = this.auctionSettingsForm.get('auctionStartsAt');
      if (control?.errors?.['dateInPast']) {
        const errors = { ...control.errors };
        delete errors['dateInPast'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      return;
    }

    const auctionStartsAtIso = this.auctionSettingsForm.get('auctionStartsAt')?.value;
    const auctionStartsAtControl = this.auctionSettingsForm.get('auctionStartsAt');

    if (!auctionStartsAtIso) {
      if (auctionStartsAtControl?.touched) {
        this.#setDateTimeError(
          this.#translateService.instant('common.requiredField'),
          this.auctionStartDateErrorMessage,
          this.hasAuctionStartDateError,
        );
      } else {
        this.auctionStartDateErrorMessage.set(null);
        this.hasAuctionStartDateError.set(false);
      }
      return;
    }

    const startMoment = moment.utc(auctionStartsAtIso);
    const now = moment();

    if (startMoment.isSameOrBefore(now)) {
      this.#setDateTimeError(
        this.#translateService.instant('planSettings.auction.errors.auctionStartDateFuture'),
        this.auctionStartDateErrorMessage,
        this.hasAuctionStartDateError,
      );
      auctionStartsAtControl?.setErrors({ dateInPast: true });
    } else {
      this.auctionStartDateErrorMessage.set(null);
      this.hasAuctionStartDateError.set(false);
      if (auctionStartsAtControl?.errors?.['dateInPast']) {
        const errors = { ...auctionStartsAtControl.errors };
        delete errors['dateInPast'];
        auctionStartsAtControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }

  #validateEventEndDate(): void {
    const eventEndsAtIso = this.auctionSettingsForm.get('eventEndsAt')?.value;
    const eventStartsAtIso = this.auctionSettingsForm.get('eventStartsAt')?.value;
    const auctionEndsAtIso = this.auctionSettingsForm.get('auctionEndsAt')?.value;
    const eventEndsAtControl = this.auctionSettingsForm.get('eventEndsAt');

    if (!eventEndsAtIso) {
      if (eventEndsAtControl?.touched) {
        this.#setDateTimeError(
          this.#translateService.instant('common.requiredField'),
          this.eventEndDateErrorMessage,
          this.hasEventEndDateError,
        );
      } else {
        this.eventEndDateErrorMessage.set(null);
        this.hasEventEndDateError.set(false);
      }
      return;
    }

    if (eventStartsAtIso) {
      const eventStartMoment = moment.utc(eventStartsAtIso);
      const eventEndMoment = moment.utc(eventEndsAtIso);

      if (eventEndMoment.isBefore(eventStartMoment)) {
        this.#setDateTimeError(
          this.#translateService.instant('planSettings.auction.errors.eventEndDateAfterOrEqualStart'),
          this.eventEndDateErrorMessage,
          this.hasEventEndDateError,
        );
        eventEndsAtControl?.setErrors({ endDateBeforeStart: true });
        return;
      }
    }

    if (auctionEndsAtIso) {
      const auctionEndMoment = moment.utc(auctionEndsAtIso);
      const eventEndMoment = moment.utc(eventEndsAtIso);

      if (eventEndMoment.isSameOrBefore(auctionEndMoment)) {
        this.#setDateTimeError(
          this.#translateService.instant('planSettings.auction.errors.eventEndDateAfterAuctionEnd'),
          this.eventEndDateErrorMessage,
          this.hasEventEndDateError,
        );
        eventEndsAtControl?.setErrors({ eventEndBeforeAuctionEnd: true });
        return;
      }
    }

    this.eventEndDateErrorMessage.set(null);
    this.hasEventEndDateError.set(false);
    if (eventEndsAtControl?.errors?.['endDateBeforeStart'] || eventEndsAtControl?.errors?.['eventEndBeforeAuctionEnd']) {
      const errors = { ...eventEndsAtControl.errors };
      delete errors['endDateBeforeStart'];
      delete errors['eventEndBeforeAuctionEnd'];
      eventEndsAtControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }

  #validateEventStartDate(): void {
    const eventStartsAtIso = this.auctionSettingsForm.get('eventStartsAt')?.value;
    const auctionStartsAtIso = this.auctionSettingsForm.get('auctionStartsAt')?.value;
    const eventStartsAtControl = this.auctionSettingsForm.get('eventStartsAt');

    if (!eventStartsAtIso) {
      if (eventStartsAtControl?.touched) {
        this.#setDateTimeError(
          this.#translateService.instant('common.requiredField'),
          this.eventStartDateErrorMessage,
          this.hasEventStartDateError,
        );
      } else {
        this.eventStartDateErrorMessage.set(null);
        this.hasEventStartDateError.set(false);
      }
      return;
    }

    if (auctionStartsAtIso) {
      const auctionStartMoment = moment.utc(auctionStartsAtIso);
      const eventStartMoment = moment.utc(eventStartsAtIso);

      if (eventStartMoment.isSameOrBefore(auctionStartMoment)) {
        this.#setDateTimeError(
          this.#translateService.instant('planSettings.auction.errors.eventStartDateAfterAuctionStart'),
          this.eventStartDateErrorMessage,
          this.hasEventStartDateError,
        );
        eventStartsAtControl?.setErrors({ eventStartBeforeAuctionStart: true });
        return;
      }
    }

    this.eventStartDateErrorMessage.set(null);
    this.hasEventStartDateError.set(false);
    if (eventStartsAtControl?.errors?.['eventStartBeforeAuctionStart']) {
      const errors = { ...eventStartsAtControl.errors };
      delete errors['eventStartBeforeAuctionStart'];
      eventStartsAtControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }
}
