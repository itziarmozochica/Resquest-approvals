import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { SelectOptionTypeaheadInput } from '@fz-original/app/core/tracking/core/events/select-option-typeahead';
import { ListPlanItem } from '@fz-original/app/modules/attendees/list-attendees/models/list-plan-item.model';
import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { waitlistSettingsErrorCodes } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/waitlist/waitlist-settings-error-codes';
import { WaitlistSettings } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/waitlist/waitlist-settings.model';
import { WaitlistSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/waitlist/waitlist-settings.service';
import { resolveEventTimezone } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/resolve-event-timezone.util';
import { showNothingToChangeToast } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/show-nothing-to-change-toast.util';
import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import { DropdownService } from '@fz-original/app/shared/dropdown/dropdown.service';
import { SelectDropdownPlanOption } from '@fz-original/app/shared/dropdown/select-dropdown-plan-option';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { TypeaheadEvent } from '@fz-original/app/shared/layout/filters/typeahead/typeahead-event.model';
import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SearchBarFilter } from '@fz-original/app/shared/search-bar/enums/search-bar-filter.enum';
import { SearchBarModule } from '@fz-original/app/shared/search-bar/search-bar.module';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { resolveErrorCodeDisplayMessage } from '@fz-original/app/shared/utils/resolve-error-code-display-message.util';
import { IgntAlertComponent } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntNativeDateInputComponent } from '@ignite/legacy/components/ignt-native-date-input/ignt-native-date-input.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { forkJoin, of, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionsBarComponent,
    CommonModule,
    IgntAlertComponent,
    IgntCheckboxComponent,
    IgntNativeDateInputComponent,
    IgntToggleComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    SearchBarModule,
    TranslateModule,
  ],
  selector: 'app-waitlist-settings',
  standalone: true,
  styleUrls: ['./waitlist-settings.component.scss'],
  templateUrl: './waitlist-settings.component.html',
})
export class WaitlistSettingsComponent implements OnInit {
  #destroyRef = inject(DestroyRef);
  #dropdownService = inject(DropdownService);
  #formBuilder = inject(FormBuilder);
  #optimizelyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);
  #planService = inject(PlanService);
  #router = inject(Router);
  #toastService = inject(ToastService);
  #translateService = inject(TranslateService);
  #waitlistSettingsService = inject(WaitlistSettingsService);
  dateErrorMessage = signal<string | null>(null);

  eventTimezone = signal<string>('UTC');
  expirationDateTimeLocal = signal<string>('');
  protected readonly filterType = SearchBarFilter;
  hasDateError = signal(false);
  hasExpirationDate = signal(false);
  isSaving = signal(false);
  isRedirectionChecked = signal(false);
  selectedPlan = signal<SelectDropdownPlanOption | undefined>(undefined);
  isRedirectionDisabled = computed(() => !this.selectedPlan());
  minDateTimeLocal = signal<string>(this.#formatForDatetimeLocal(new Date()));
  readonly canEditPlan = input<boolean>(true);
  readonly continueToNextTab = input<(() => void) | null>(null);
  @Input() mode: 'creation' | 'edit' = 'creation';
  @Input() onFormDirtyChange?: (dirty: boolean) => void;
  planError = signal<string | null>(null);
  @Input({ required: true }) planId!: number;
  @Input() planCreationStatus: PlanCreationStatusData | null = null;
  planOptions = signal<SelectDropdownPlanOption[]>([]);
  protected readonly SearchBarFilter = SearchBarFilter;
  protected readonly SelectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  protected readonly selectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  @Input() settings: Partial<MainPlanSettings> | null = null;

  showId = this.#optimizelyService.isFeatureEnabled('search_bar_shows_id') ?? false;
  useIdInSearch = this.#optimizelyService.isFeatureEnabled('search_bar_uses_id_in_search') ?? false;

  waitlistSettingsForm: FormGroup = this.#formBuilder.group({
    automaticRedirection: [false],
    expirationDateTime: [null],
    hasExpiration: [false],
    relatedEventId: [null],
  });

  constructor() {
    effect(() => {
      this.canEditPlan();
      this.#applyCanEditPlanToForm();
    });
  }

  ngOnInit(): void {
    this.#loadPlanAndDropdownPlans();
    this.#subscribeToFormDirtyState();
  }

  onConfirm(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }
    if (this.mode === 'edit' && !this.waitlistSettingsForm.dirty) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }
    const navigateOnSuccess = this.mode === 'creation';
    const successMessageKey = this.mode === 'edit' ? 'eventSettings.successMessage' : 'planSettings.success.settingsSaved';
    this.#saveSettings(navigateOnSuccess, successMessageKey);
  }

  onExpirationDateTimeBlur(): void {
    this.waitlistSettingsForm.get('expirationDateTime')?.markAsTouched();
    this.#validateDate();
  }

  onExpirationDateTimeChange(value: string): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.expirationDateTimeLocal.set(value);

    const isoValue = this.#localToUtcIso(value);
    const control = this.waitlistSettingsForm.get('expirationDateTime');
    if (control) {
      control.setValue(isoValue);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
    }
    this.#validateDate();
  }

  onExpirationToggle(): void {
    if (!this.canEditPlan()) {
      return;
    }
    const checked = !this.hasExpirationDate();
    this.hasExpirationDate.set(checked);
    this.waitlistSettingsForm.patchValue({ hasExpiration: checked });
    this.waitlistSettingsForm.markAsDirty();
    this.planError.set(null);

    const expirationDateTimeControl = this.waitlistSettingsForm.get('expirationDateTime');

    if (checked) {
      expirationDateTimeControl?.setValidators([Validators.required]);
      expirationDateTimeControl?.updateValueAndValidity();
    } else {
      expirationDateTimeControl?.clearValidators();
      expirationDateTimeControl?.updateValueAndValidity();
      this.selectedPlan.set(undefined);
      this.dateErrorMessage.set(null);
      this.hasDateError.set(false);
      this.isRedirectionChecked.set(false);
      this.expirationDateTimeLocal.set('');
      this.waitlistSettingsForm.patchValue({
        automaticRedirection: false,
        expirationDateTime: null,
        relatedEventId: null,
      });
    }
  }

  onPlanSelected(plan: SelectDropdownPlanOption): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.selectedPlan.set(plan);
    this.waitlistSettingsForm.patchValue({
      relatedEventId: plan.id,
    });
    this.waitlistSettingsForm.markAsDirty();
    this.planError.set(null);
  }

  onRedirectionToggle(checked: boolean): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.waitlistSettingsForm.patchValue({
      automaticRedirection: checked,
    });
    this.waitlistSettingsForm.markAsDirty();
    this.isRedirectionChecked.set(checked);
  }

  onSaveDraft(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }
    if (!this.waitlistSettingsForm.dirty) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }

    this.#saveSettings(false, 'planSettings.success.draftSaved');
  }

  onTypeaheadInteraction(event: TypeaheadEvent): void {
    if (!this.canEditPlan()) {
      return;
    }
    if (typeof event.selectedOption === 'string') {
      const trimmedValue = event.selectedOption.trim();
      if (trimmedValue === '') {
        this.selectedPlan.set(undefined);
        this.isRedirectionChecked.set(false);
        this.planError.set(null);
        this.waitlistSettingsForm.patchValue({
          automaticRedirection: false,
          relatedEventId: null,
        });
        this.waitlistSettingsForm.markAsDirty();
      }
    }
  }

  #applyCanEditPlanToForm(): void {
    if (this.canEditPlan()) {
      this.waitlistSettingsForm.enable({ emitEvent: false });
    } else {
      this.waitlistSettingsForm.disable({ emitEvent: false });
    }
  }

  #buildSettings(): WaitlistSettings {
    const formValue = this.waitlistSettingsForm.value;

    return {
      automaticRedirection: formValue.automaticRedirection,
      presaleClosesAt: null,
      targetPlanId: formValue.relatedEventId,
      waitlistClosesAt: formValue.expirationDateTime ? new Date(formValue.expirationDateTime) : null,
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

  #isRelatedEventError(error: BaseErrorResponse): boolean {
    const errorCode = error?.code?.toString();
    return (
      errorCode === waitlistSettingsErrorCodes.targetHasRedirection || errorCode === waitlistSettingsErrorCodes.targetHasActiveWaitlist
    );
  }

  #loadPlanAndDropdownPlans(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return;
    }

    forkJoin({
      plan: this.#planService.getPlan(partner.id, this.planId),
      plans: this.#planService.getPlans(partner.id).pipe(
        map(response => {
          if (!response.data) {
            return [];
          }
          return response.data
            .filter(plan => plan.id !== this.planId && plan.kind !== 'waitlist')
            .map(
              plan =>
                ({
                  id: plan.id,
                  name: plan.name,
                  status: plan.status,
                }) as ListPlanItem,
            );
        }),
      ),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('planSettings.errors.loadFailed'),
            sentiment: AlertSentiment.danger,
          });
          this.eventTimezone.set('UTC');
          this.#updateMinDateTimeLocal();
          this.#loadWaitlistSettings();
        },
        next: ({ plan, plans }) => {
          this.eventTimezone.set(resolveEventTimezone(plan.data));
          this.#updateMinDateTimeLocal();
          const dropdownOptions = this.#dropdownService.getPlanDropdownOptions(plans);
          this.planOptions.set(dropdownOptions);

          this.#loadWaitlistSettings();
        },
      });
  }

  #loadWaitlistSettings(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return;
    }
    this.#waitlistSettingsService
      .getWaitlistSettings(partner.id, this.planId)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        tap((settings: WaitlistSettings | null) => {
          if (settings) {
            const hasExpiration = !!settings.waitlistClosesAt;
            this.hasExpirationDate.set(hasExpiration);
            this.isRedirectionChecked.set(settings.automaticRedirection ?? false);

            const timezone = this.eventTimezone();
            const expirationDateTimeIso = settings.waitlistClosesAt ? moment.utc(settings.waitlistClosesAt).toISOString() : null;
            const expirationDateTimeLocal = expirationDateTimeIso ? this.#utcToLocal(expirationDateTimeIso, timezone) : '';

            this.waitlistSettingsForm.patchValue({
              automaticRedirection: settings.automaticRedirection ?? false,
              expirationDateTime: expirationDateTimeIso,
              hasExpiration: hasExpiration,
              relatedEventId: settings.targetPlanId,
            });

            this.expirationDateTimeLocal.set(expirationDateTimeLocal);

            const expirationDateTimeControl = this.waitlistSettingsForm.get('expirationDateTime');
            if (hasExpiration) {
              expirationDateTimeControl?.setValidators([Validators.required]);
            } else {
              expirationDateTimeControl?.clearValidators();
            }
            expirationDateTimeControl?.updateValueAndValidity();

            if (settings.targetPlanId) {
              const planOption = this.planOptions().find(option => option.id === settings.targetPlanId);
              if (planOption) {
                this.selectedPlan.set(planOption);
              }
            }

            this.#validateDate();
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

  #resolveErrorFeedback(error: BaseErrorResponse): string {
    const errorMessage = resolveErrorCodeDisplayMessage(this.#translateService, error, 'planSettings.errors.saveFailed');

    if (this.#isRelatedEventError(error)) {
      this.planError.set(errorMessage);
    }

    return errorMessage;
  }

  #saveSettings(navigateOnSuccess: boolean, successMessageKey: string): void {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return;
    }

    this.waitlistSettingsForm.markAllAsTouched();
    this.#validateDate();

    if (this.waitlistSettingsForm.invalid || this.hasDateError()) {
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('planSettings.errors.requiredFields'),
        sentiment: AlertSentiment.danger,
      });
      return;
    }
    const payload = this.#buildSettings();
    this.planError.set(null);
    this.isSaving.set(true);
    this.#waitlistSettingsService
      .saveWaitlistSettings(partner.id, this.planId, payload)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: BaseErrorResponse) => {
          this.isSaving.set(false);

          if (this.hasExpirationDate()) {
            this.#validateDate();
          }

          this.#toastService.add({
            autoHide: true,
            message: this.#resolveErrorFeedback(error),
            sentiment: AlertSentiment.danger,
          });
        },
        next: () => {
          this.isSaving.set(false);
          this.waitlistSettingsForm.markAsPristine();
          this.onFormDirtyChange?.(false);
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
        },
      });
  }

  #subscribeToFormDirtyState(): void {
    if (!this.onFormDirtyChange) {
      return;
    }
    this.waitlistSettingsForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.onFormDirtyChange?.(this.waitlistSettingsForm.dirty);
    });
  }

  #updateMinDateTimeLocal(): void {
    this.minDateTimeLocal.set(moment.tz(this.eventTimezone()).format('YYYY-MM-DDTHH:mm'));
  }

  #utcToLocal(isoString: string, timezone: string): string {
    const m = moment.utc(isoString).tz(timezone);
    return m.format('YYYY-MM-DDTHH:mm');
  }

  #validateDate(): void {
    const expirationDateTimeIso = this.waitlistSettingsForm.get('expirationDateTime')?.value;
    const expirationDateTimeControl = this.waitlistSettingsForm.get('expirationDateTime');

    if (!expirationDateTimeIso) {
      if (this.hasExpirationDate() && expirationDateTimeControl?.touched) {
        this.dateErrorMessage.set(this.#translateService.instant('common.requiredField'));
        this.hasDateError.set(true);
      } else {
        this.dateErrorMessage.set(null);
        this.hasDateError.set(false);
      }
      return;
    }

    const expirationMoment = moment.utc(expirationDateTimeIso);
    const now = moment();

    if (expirationMoment.isSameOrBefore(now)) {
      this.dateErrorMessage.set(this.#translateService.instant('planSettings.waitlist.expirationFuture'));
      this.hasDateError.set(true);
      expirationDateTimeControl?.setErrors({ dateInPast: true });
    } else {
      this.dateErrorMessage.set(null);
      this.hasDateError.set(false);
      if (expirationDateTimeControl?.errors?.['dateInPast']) {
        const errors = { ...expirationDateTimeControl.errors };
        delete errors['dateInPast'];
        expirationDateTimeControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }
}
