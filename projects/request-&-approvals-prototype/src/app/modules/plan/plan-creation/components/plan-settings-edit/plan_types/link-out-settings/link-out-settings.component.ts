import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  Input,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import {
  LinkOut,
  LinkOutSettings,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/link-out/link-out-settings.model';
import { showNothingToChangeToast } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/show-nothing-to-change-toast.util';
import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import languageCodes from '@fz-original/app/shared/components/language-selector/language-codes';
import { SUPPORTED_LANGUAGES } from '@fz-original/app/shared/constants/supported-translations-languages';
import { AutoformatNumericInputModule } from '@fz-original/app/shared/directives/autoformat-numeric-input/autoformat-numeric-input.module';
import { TemplatedTooltipDirective } from '@fz-original/app/shared/directives/templated-tooltip.directive';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanDetailService } from '@fz-original/app/shared/services/plan/plan-detail.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntNativeDateInputComponent } from '@ignite/legacy/components/ignt-native-date-input/ignt-native-date-input.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { catchError, of, switchMap, tap } from 'rxjs';

import { LinkOutSettingsService } from '../../services/link-out/link-out-settings.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionsBarComponent,
    AutoformatNumericInputModule,
    IgntAlertComponent,
    IgntFieldErrorComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntNativeDateInputComponent,
    IgntToggleComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    TemplatedTooltipDirective,
    TranslateModule,
  ],
  selector: 'app-link-out-settings',
  standalone: true,
  styleUrls: ['./link-out-settings.component.scss'],
  templateUrl: './link-out-settings.component.html',
})
export class LinkOutSettingsComponent implements OnInit {
  #destroyRef = inject(DestroyRef);
  #eventTimezone = 'UTC';

  #formBuilder = inject(FormBuilder);
  #linkOutService = inject(LinkOutSettingsService);
  #partnerService = inject(PartnerService);
  #planDetailService = inject(PlanDetailService);
  #router = inject(Router);
  #startDateInPast = signal(false);
  #toastService = inject(ToastService);

  #translateService = inject(TranslateService);

  get eventTimezone(): string {
    return this.#eventTimezone;
  }

  get hasDateRangeError(): boolean {
    return !!(this.form.hasError('dateRange') && this.form.get('startsAt')?.touched && this.form.get('endsAt')?.touched);
  }

  get hasEndDateError(): boolean {
    const control = this.form.get('endsAt');
    return !!(control && control.invalid && control.touched);
  }

  get hasStartDateError(): boolean {
    const control = this.form.get('startsAt');
    return !!(control && control.invalid && control.touched) || this.#startDateInPast();
  }

  get hasStartingPriceError(): boolean {
    const control = this.form.get('startingPrice');
    return !!(control && control.invalid && control.touched);
  }

  get localizedUrls(): FormArray {
    return this.form.get('localizedUrls') as FormArray;
  }

  cityCurrency = signal<string>('');

  endsAtLocal = signal<string>('');

  form: FormGroup = this.#formBuilder.group(
    {
      isDirectRouting: [true],
      redirectButtonLabel: [null],
      startsAt: [null, { validators: Validators.required }],
      endsAt: [null, { validators: Validators.required }],
      startingPrice: [null, { validators: [Validators.required, Validators.min(0)] }],
      mainUrl: [null, { validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)] }],
      localizedUrls: this.#formBuilder.array([]),
    },
    { validators: this.#dateRangeValidator() },
  );

  isSaving: WritableSignal<boolean> = signal(false);

  minDateLocal = signal<string>(this.#formatDateForInput(new Date()));

  readonly canEditPlan = input<boolean>(true);
  readonly continueToNextTab = input<(() => void) | null>(null);
  @Input() mode: 'creation' | 'edit' = 'creation';
  @Input() onFormDirtyChange?: (dirty: boolean) => void;
  @Input({ required: true }) planId!: number;
  @Input() planCreationStatus: PlanCreationStatusData | null = null;
  @Input() settings: Partial<MainPlanSettings> | null = null;

  startsAtLocal = signal<string>('');

  supportedLanguageOptions: SelectOption[] = [];

  readonly supportedTranslationLanguages = SUPPORTED_LANGUAGES.map(code => ({
    code,
    name: languageCodes[code] || code,
  }));

  constructor() {
    effect(() => {
      this.canEditPlan();
      this.#applyCanEditPlanToForm();
    });
  }

  getEndDateMin(): string {
    const startDate = this.startsAtLocal();
    const minDate = this.minDateLocal();

    if (!startDate) return minDate;

    return startDate > minDate ? startDate : minDate;
  }

  getSelectedLanguageOption(index: number): SelectOption | undefined {
    const localizedUrlGroup = this.localizedUrls.at(index);
    if (!localizedUrlGroup) {
      return undefined;
    }

    const currentValue = localizedUrlGroup.get('language')?.value;
    return this.supportedLanguageOptions.find(option => option.id === currentValue);
  }

  ngOnInit(): void {
    this.#initializeSupportedTranslationLanguages();
    this.#loadPlanDetailsAndSettings();
    this.#subscribeToFormDirtyState();
  }

  #applyCanEditPlanToForm(): void {
    if (this.canEditPlan()) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
  }

  #subscribeToFormDirtyState(): void {
    if (!this.onFormDirtyChange) {
      return;
    }
    this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.onFormDirtyChange?.(this.form.dirty);
    });
  }

  onConfirm(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }
    if (this.mode === 'edit' && !this.form.dirty) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }
    this.#saveSettings({
      navigateOnSuccess: this.mode === 'creation',
      successMessageKey: this.mode === 'edit' ? 'eventSettings.successMessage' : 'planSettings.success.settingsSaved',
    });
  }

  onDraftSaved(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }
    if (!this.form.dirty) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }

    this.#saveSettings({
      navigateOnSuccess: false,
      successMessageKey: 'planSettings.success.draftSaved',
    });
  }

  onEndDateBlur(): void {
    this.form.get('endsAt')?.markAsTouched();
  }

  onEndDateChange(value: string): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.endsAtLocal.set(value);

    const control = this.form.get('endsAt');
    if (control) {
      control.setValue(value || null);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
      this.form.updateValueAndValidity();
    }
  }

  onIsDirectRoutingToggle(): void {
    if (!this.canEditPlan()) {
      return;
    }
    const control = this.form.get('isDirectRouting');
    if (control) {
      control.setValue(!control.value);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
    }
  }

  onLanguageSelected(option: SelectOption | undefined, index: number): void {
    if (!this.canEditPlan()) {
      return;
    }
    const localizedUrlGroup = this.localizedUrls.at(index);
    if (!localizedUrlGroup) {
      return;
    }

    const languageControl = localizedUrlGroup.get('language');
    if (languageControl) {
      languageControl.setValue(option?.id ?? null);
      languageControl.markAsTouched();
      languageControl.markAsDirty();
    }
  }

  onLocalizedUrlAdded(url = '', language = '', options: { hydrateFromServer?: boolean; markAsDirty?: boolean } = {}): void {
    if (!this.canEditPlan() && !options.hydrateFromServer) {
      return;
    }
    const localizedUrlGroup = this.#formBuilder.group({
      url: [url, [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      language: [language, Validators.required],
    });

    this.localizedUrls.push(localizedUrlGroup);
    if (options.markAsDirty ?? true) {
      this.localizedUrls.markAsDirty();
      this.form.markAsDirty();
    }
    this.form.updateValueAndValidity();
  }

  onLocalizedUrlRemoved(index: number): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.localizedUrls.removeAt(index);
    this.localizedUrls.markAsDirty();
    this.form.markAsDirty();
    this.form.updateValueAndValidity();
  }

  onMainUrlBlur(): void {
    this.form.get('mainUrl')?.updateValueAndValidity();
  }

  onStartDateBlur(): void {
    this.form.get('startsAt')?.markAsTouched();
  }

  onStartDateChange(value: string): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.startsAtLocal.set(value);

    const control = this.form.get('startsAt');
    if (control) {
      control.setValue(value || null);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();
      this.form.updateValueAndValidity();
    }
    this.#validateStartDate();
  }

  onStartingPriceBlur(): void {
    const control = this.form.get('startingPrice');
    if (control && Number.isNaN(control.value)) {
      control.setValue(null);
    }
    control?.markAsTouched();
    control?.updateValueAndValidity();
  }

  #buildPayload(): LinkOutSettings {
    const linkOuts: LinkOut[] = [];

    linkOuts.push({
      redirectionUrl: this.form.value.mainUrl,
      channelId: null,
      language: null,
      shouldShowMainPlanView: !this.form.value.isDirectRouting,
    });

    this.localizedUrls.value.forEach((localizedUrl: { language: string; url: string }) => {
      linkOuts.push({
        redirectionUrl: localizedUrl.url,
        channelId: null,
        language: localizedUrl.language,
        shouldShowMainPlanView: !this.form.value.isDirectRouting,
      });
    });

    return {
      attendText: this.form.value.redirectButtonLabel,
      linkOuts,
      startsAt: this.form.value.startsAt ? moment.tz(this.form.value.startsAt, this.#eventTimezone).toDate() : null,
      endsAt: this.form.value.endsAt ? moment.tz(this.form.value.endsAt, this.#eventTimezone).toDate() : null,
      ticketPrice: this.form.value.startingPrice != null ? this.form.value.startingPrice.toString() : null,
    };
  }

  #dateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startsAt = control.get('startsAt')?.value;
      const endsAt = control.get('endsAt')?.value;

      if (!startsAt || !endsAt) {
        return null;
      }

      const startDate = moment(startsAt);
      const endDate = moment(endsAt);

      if (endDate.isBefore(startDate)) {
        return { dateRange: { message: 'End date cannot be before start date' } };
      }

      return null;
    };
  }

  #formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  #initializeSupportedTranslationLanguages(): void {
    this.supportedLanguageOptions = this.supportedTranslationLanguages.map(lang => ({
      id: lang.code,
      title: lang.name,
    }));
  }

  #loadPlanDetailsAndSettings(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      this.#toastService.add({
        message: this.#translateService.instant('planSettings.errors.partnerNotFound'),
        sentiment: AlertSentiment.danger,
        autoHide: true,
      });
      return;
    }

    this.#planDetailService
      .getPlanDetail(partner.id, this.planId)
      .pipe(
        tap((planDetail: PlanDetail | []) => {
          if (!Array.isArray(planDetail)) {
            this.#eventTimezone = planDetail.venues?.[0]?.timezone || 'UTC';
            this.cityCurrency.set(planDetail.venues?.[0]?.currency ?? '');
          }
          this.minDateLocal.set(moment.tz(this.#eventTimezone).format('YYYY-MM-DD'));
        }),
        switchMap(() => this.#linkOutService.getLinkOutSettings(partner.id, this.planId)),
        tap((settings: LinkOutSettings) => {
          if (settings) {
            const mainLinkOut = settings.linkOuts.find((linkOut: LinkOut) => linkOut.language === null);
            const localizedLinkOuts = settings.linkOuts.filter((linkOut: LinkOut) => linkOut.language !== null);

            const startsAtLocal = settings.startsAt ? moment.tz(settings.startsAt, this.#eventTimezone).format('YYYY-MM-DD') : '';
            const endsAtLocal = settings.endsAt ? moment.tz(settings.endsAt, this.#eventTimezone).format('YYYY-MM-DD') : '';

            this.form.patchValue(
              {
                isDirectRouting: mainLinkOut ? !mainLinkOut.shouldShowMainPlanView : true,
                redirectButtonLabel: settings.attendText || null,
                startsAt: startsAtLocal || null,
                endsAt: endsAtLocal || null,
                startingPrice: settings.ticketPrice != null ? Number(settings.ticketPrice) : null,
                mainUrl: mainLinkOut?.redirectionUrl || null,
              },
              { emitEvent: false },
            );

            this.startsAtLocal.set(startsAtLocal);
            this.endsAtLocal.set(endsAtLocal);

            this.#validateStartDate();

            localizedLinkOuts.forEach((linkOut: LinkOut) => {
              this.onLocalizedUrlAdded(linkOut.redirectionUrl, linkOut.language || '', {
                hydrateFromServer: true,
                markAsDirty: false,
              });
            });
          }

          this.#applyCanEditPlanToForm();
        }),
        catchError(() => {
          this.#toastService.add({
            message: this.#translateService.instant('planSettings.errors.loadFailed'),
            sentiment: AlertSentiment.danger,
            autoHide: true,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #saveSettings(options: { navigateOnSuccess: boolean; successMessageKey: string }): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      this.#toastService.add({
        message: this.#translateService.instant('planSettings.errors.partnerNotFound'),
        sentiment: AlertSentiment.danger,
        autoHide: true,
      });
      return;
    }

    this.#validateStartDate();

    if (this.form.invalid || this.#startDateInPast()) {
      this.form.markAllAsTouched();

      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        control?.updateValueAndValidity();
      });

      this.#toastService.add({
        message: this.#translateService.instant('planSettings.errors.requiredFields'),
        sentiment: AlertSentiment.danger,
        autoHide: true,
      });
      return;
    }

    this.isSaving.set(true);

    const payload = this.#buildPayload();

    this.#linkOutService
      .saveLinkOutSettings(partner.id, this.planId, payload)
      .pipe(
        tap(() => {
          this.isSaving.set(false);
          this.form.markAsPristine();
          this.onFormDirtyChange?.(false);
          this.#toastService.add({
            message: this.#translateService.instant(options.successMessageKey),
            sentiment: AlertSentiment.positive,
            autoHide: true,
          });

          const continueToNextTab = this.continueToNextTab();
          if (options.navigateOnSuccess && continueToNextTab) {
            continueToNextTab();
          } else if (options.navigateOnSuccess) {
            this.#router.navigate(['/plans/dashboard', this.planId]);
          }
        }),
        catchError(() => {
          this.isSaving.set(false);
          this.#toastService.add({
            message: this.#translateService.instant('planSettings.errors.saveFailed'),
            sentiment: AlertSentiment.danger,
            autoHide: true,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #validateStartDate(): void {
    const startsAt = this.form.get('startsAt')?.value;
    const startsAtControl = this.form.get('startsAt');

    if (!startsAt) {
      this.#startDateInPast.set(false);
      return;
    }

    const minDate = this.minDateLocal();
    if (startsAt < minDate) {
      this.#startDateInPast.set(true);
      startsAtControl?.setErrors({ dateInPast: true });
    } else {
      this.#startDateInPast.set(false);
      if (startsAtControl?.errors?.['dateInPast']) {
        const errors = { ...startsAtControl.errors };
        delete errors['dateInPast'];
        startsAtControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }
}
