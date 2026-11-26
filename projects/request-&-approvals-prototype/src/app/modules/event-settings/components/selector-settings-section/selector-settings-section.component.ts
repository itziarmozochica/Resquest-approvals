import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, forwardRef, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntAlertComponent, IgntSwitchComponent } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { mainPlanLabelFormatMaxLength } from '../../models/main-plan-settings.model';
import { SelectorSettingType, SessionSelectorType } from '../../models/selector-session-section.enum';
import { SelectorTypeLabel, SESSION_TYPE_LABELS, SETTING_TYPE_LABELS } from '../../models/selector-type-label.model';
import { SelectorSettingsSectionConfig } from '../../models/settings-configs.model';
import { formatFallbackLabel } from '../../utils/format-fallback-label.util';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FeverOnlyMarkerComponent,
    IgntAlertComponent,
    IgntInputFieldComponent,
    IgntSwitchComponent,
    IgntTypeaheadModule,
    IgntWrapperCardComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectorSettingsSectionComponent),
    },
  ],
  selector: 'app-selector-settings-section',
  standalone: true,
  styleUrls: ['./selector-settings-section.component.scss'],
  templateUrl: './selector-settings-section.component.html',
})
export class SelectorSettingsSectionComponent implements ControlValueAccessor {
  readonly canEditPlan = input<boolean>(true);
  readonly config = input<SelectorSettingsSectionConfig | null>(null);

  #isDisabled = false;

  #onChange: (value: { calendar: boolean; continuousTime: boolean; labelFormat: string; session: string; setting: string }) => void =
    () => {};
  #onTouched = () => {};
  readonly #destroyRef = inject(DestroyRef);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  constructor() {
    effect(() => {
      this.config();
      untracked(() => this.#updateFieldStates());
    });

    this.calendarControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: boolean | null) => {
      if (value !== null) {
        this.#emitChange();
        this.#onTouched();
      }
    });
    this.continuousTimeControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: boolean | null) => {
      if (value !== null) {
        this.#emitChange();
        this.#onTouched();
      }
    });
    this.labelFormatControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: string | null) => {
      if (value !== null) {
        this.#emitChange();
        this.#onTouched();
      }
    });
    this.sessionSelectorControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: string | null) => {
      if (value !== null) {
        this.#emitChange();
        this.#onTouched();
      }
    });
    this.settingSelectorControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: string | null) => {
      if (value !== null) {
        this.#emitChange();
        this.#onTouched();
      }
    });
  }
  get canEditCalendar(): boolean {
    return !this.#isDisabled && (this.config()?.calendar.editable ?? true);
  }
  get canEditContinuousTime(): boolean {
    return !this.#isDisabled && (this.config()?.continuousTime.editable ?? true);
  }
  get canEditLabel(): boolean {
    return !this.#isDisabled && (this.config()?.labelFormat.editable ?? true);
  }
  get canEditSession(): boolean {
    return !this.#isDisabled && (this.config()?.session.editable ?? true);
  }
  get canEditSetting(): boolean {
    return !this.#isDisabled && (this.config()?.setting.editable ?? true);
  }
  get canViewCalendar(): boolean {
    return this.config()?.calendar.visible ?? true;
  }
  get canViewContinuousTime(): boolean {
    return this.config()?.continuousTime.visible ?? true;
  }

  get canViewLabel(): boolean {
    return this.config()?.labelFormat.visible ?? true;
  }

  get canViewSession(): boolean {
    return this.config()?.session.visible ?? true;
  }

  calendarControl = new FormControl<boolean>(false);

  get canViewSetting(): boolean {
    return this.config()?.setting.visible ?? true;
  }
  isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  continuousTimeControl = new FormControl<boolean>(false);

  labelFormatControl = new FormControl<string>('');
  protected readonly labelFormatMaxLength = mainPlanLabelFormatMaxLength;
  readonly selectorOptions = computed(() => this.#toOptions(SESSION_TYPE_LABELS, this.config()?.session.allowed));

  readonly selectorSettingType = SelectorSettingType;
  sessionSelectorControl = new FormControl<string>(SessionSelectorType.DateTime);
  readonly sessionSelectorType = SessionSelectorType;

  readonly settingOptions = computed(() => this.#toOptions(SETTING_TYPE_LABELS, this.config()?.setting.allowed));
  settingSelectorControl = new FormControl<string>(SelectorSettingType.SingleVertical);

  onContinuousTimeToggleChange(checked: boolean): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.continuousTimeControl.setValue(checked);
  }

  onSelectorTypeaheadChange(option: SelectOption): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.sessionSelectorControl.setValue(option.id);
  }

  onSettingTypeaheadChange(option: SelectOption): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.settingSelectorControl.setValue(option.id);
  }

  onToggleChange(checked: boolean): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.calendarControl.setValue(checked);
  }

  registerOnChange(
    fn: (value: { calendar: boolean; continuousTime: boolean; labelFormat: string; session: string; setting: string }) => void,
  ): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  get selectedOption(): SelectOption | undefined {
    const value = this.sessionSelectorControl.value;
    return this.selectorOptions().find(option => option.id === value);
  }

  get selectedSettingOption(): SelectOption | undefined {
    const value = this.settingSelectorControl.value;
    return this.settingOptions().find(option => option.id === value);
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isDisabled = isDisabled;
    this.#updateFieldStates();
  }

  writeValue(value: { calendar: boolean; continuousTime: boolean; labelFormat: string; session: string; setting: string }): void {
    if (value != null) {
      this.calendarControl.setValue(value.calendar, { emitEvent: false });
      this.continuousTimeControl.setValue(value.continuousTime, { emitEvent: false });
      this.labelFormatControl.setValue(value.labelFormat, { emitEvent: false });
      this.sessionSelectorControl.setValue(value.session, { emitEvent: false });
      this.settingSelectorControl.setValue(value.setting, { emitEvent: false });
      this.#updateFieldStates();
    }
  }

  #emitChange(): void {
    const calendar = this.calendarControl.value ?? false;
    const continuousTime = this.continuousTimeControl.value ?? false;
    const labelFormat = this.labelFormatControl.value ?? '';
    const sessionApi = this.sessionSelectorControl.value ?? SessionSelectorType.DateTime;
    const settingApi = this.settingSelectorControl.value ?? SelectorSettingType.SingleVertical;
    this.#onChange({ calendar, continuousTime, labelFormat, session: sessionApi, setting: settingApi });
  }

  #toOptions(labels: readonly SelectorTypeLabel<string>[], allowedValues: string[] | undefined): SelectOption[] {
    if (allowedValues == null) {
      return labels.map(({ labelKey, type }) => ({ id: type, title: this.#translateService.instant(labelKey) }));
    }

    return allowedValues.map((apiValue: string) => {
      const translationKey = labels.find(({ type }) => type === apiValue)?.labelKey;
      if (translationKey === undefined) {
        return { id: apiValue, title: formatFallbackLabel(apiValue) };
      }

      const translated = this.#translateService.instant(translationKey);
      return { id: apiValue, title: translated !== translationKey ? translated : formatFallbackLabel(apiValue) };
    });
  }

  #updateFieldStates(): void {
    if (this.canEditCalendar) {
      this.calendarControl.enable({ emitEvent: false });
    } else {
      this.calendarControl.disable({ emitEvent: false });
    }
    if (this.canEditContinuousTime) {
      this.continuousTimeControl.enable({ emitEvent: false });
    } else {
      this.continuousTimeControl.disable({ emitEvent: false });
    }
    if (this.canEditSession) {
      this.sessionSelectorControl.enable({ emitEvent: false });
    } else {
      this.sessionSelectorControl.disable({ emitEvent: false });
    }
    if (this.canEditSetting) {
      this.settingSelectorControl.enable({ emitEvent: false });
    } else {
      this.settingSelectorControl.disable({ emitEvent: false });
    }
    if (this.canEditLabel) {
      this.labelFormatControl.enable({ emitEvent: false });
    } else {
      this.labelFormatControl.disable({ emitEvent: false });
    }
  }
}
