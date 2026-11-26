import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  forwardRef,
  inject,
  Input,
  OnChanges,
  signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { PartnerConfigService } from '@fz-original/app/shared/services/partner-config/partner-config.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { PlanCategory, PlanType } from '../../models/general-section.enum';
import { GeneralSectionConfig } from '../../models/settings-configs.model';
import { MainPlanSettingsService } from '../../services/main-plan-settings.service';
import { formatFallbackLabel } from '../../utils/format-fallback-label.util';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';

const TYPE_LABELS: Partial<Record<PlanType, string>> = {
  [PlanType.deposit]: 'eventSettings.general.type.deposit',
  [PlanType.giftCard]: 'eventSettings.general.type.giftCard',
  [PlanType.giveaway]: 'eventSettings.general.type.giveaway',
  [PlanType.growth]: 'eventSettings.general.type.growth',
  [PlanType.movie]: 'eventSettings.general.type.movie',
  [PlanType.prizeDraw]: 'eventSettings.general.type.prizeDraw',
  [PlanType.showcase]: 'eventSettings.general.type.showcase',
  [PlanType.standard]: 'eventSettings.general.type.standard',
  [PlanType.waitlist]: 'eventSettings.general.type.waitlist',
};

const CATEGORY_LABELS: Partial<Record<PlanCategory, string>> = {
  [PlanCategory.art]: 'eventSettings.general.category.art',
  [PlanCategory.cinema]: 'eventSettings.general.category.cinema',
  [PlanCategory.concert]: 'eventSettings.general.category.concert',
  [PlanCategory.fashion]: 'eventSettings.general.category.fashion',
  [PlanCategory.mix]: 'eventSettings.general.category.mix',
  [PlanCategory.nightlife]: 'eventSettings.general.category.nightlife',
  [PlanCategory.sport]: 'eventSettings.general.category.sport',
  [PlanCategory.tasting]: 'eventSettings.general.category.tasting',
  [PlanCategory.theater]: 'eventSettings.general.category.theater',
  [PlanCategory.wellness]: 'eventSettings.general.category.wellness',
};

interface GeneralSettingsData {
  category?: string;
  cities: number[];
  type?: string;
}

@Component({
  selector: 'app-general-settings-section',
  templateUrl: './general-settings-section.component.html',
  styleUrls: ['./general-settings-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TranslateModule, IgntWrapperCardComponent, ReactiveFormsModule, IgntTypeaheadModule, FeverOnlyMarkerComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GeneralSettingsSectionComponent),
      multi: true,
    },
  ],
})
export class GeneralSettingsSectionComponent implements ControlValueAccessor, OnChanges {
  #destroyRef = inject(DestroyRef);
  #mainPlanSettingsService = inject(MainPlanSettingsService);
  #onChange: (value: GeneralSettingsData) => void = () => {};
  #onTouched: () => void = () => {};
  #partnerConfigService = inject(PartnerConfigService);
  #partnerService = inject(PartnerService);
  #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  get canEditCategory(): boolean {
    return this.config?.category.editable ?? true;
  }

  get canEditCities(): boolean {
    return this.config?.cities.editable ?? true;
  }
  get canEditType(): boolean {
    return this.config?.type.editable ?? true;
  }
  get canViewCategory(): boolean {
    if (this.#partnerConfigService.config?.ui?.hidePlanCategory === true) {
      return false;
    }
    return this.config?.category.visible ?? true;
  }
  get canViewCities(): boolean {
    return this.config?.cities.visible ?? true;
  }
  get canViewType(): boolean {
    return this.config?.type.visible ?? true;
  }
  categoryOptions: SelectOption[] = [];
  cityOptions: WritableSignal<SelectOption[]> = signal([]);
  @Input() config: GeneralSectionConfig | null = null;

  isDisabled = signal(false);
  partner: Partner | null;
  selectedCategory: WritableSignal<SelectOption | undefined> = signal(undefined);
  selectedCity: WritableSignal<SelectOption | undefined> = signal(undefined);
  selectedType: WritableSignal<SelectOption | undefined> = signal(undefined);
  typeOptions: SelectOption[] = [];

  constructor() {
    this.partner = this.#partnerService.getPartner();
    this.#loadInitialCities();
    this.#initializeTypeOptions();
    this.#initializeCategoryOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      if (this.config.category.allowed) {
        this.categoryOptions = this.#mapToSelectOptions(this.config.category.allowed, CATEGORY_LABELS);
      }
      if (this.config.type.allowed) {
        this.typeOptions = this.#mapToSelectOptions(this.config.type.allowed, TYPE_LABELS);
      }
    }
  }

  onCategorySelected(option: SelectOption): void {
    this.selectedCategory.set(option);
    this.#emitChange();
    this.#onTouched();
  }

  onCityInputInteraction(searchTerm: string): void {
    if (searchTerm.length < 2) {
      this.cityOptions.set([]);
      return;
    }

    if (!this.partner) {
      return;
    }
    this.#mainPlanSettingsService
      .searchCities(this.partner.id, searchTerm)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: cities => {
          this.cityOptions.set(
            cities.map(city => ({
              id: city.id,
              title: city.name,
            })),
          );
        },
        error: () => {
          this.cityOptions.set([]);
        },
      });
  }

  isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  onCitySelected(option: SelectOption): void {
    this.selectedCity.set(option);
    this.#emitChange();
    this.#onTouched();
  }

  onTypeSelected(option: SelectOption): void {
    this.selectedType.set(option);
    this.#emitChange();
    this.#onTouched();
  }

  registerOnChange(fn: (value: GeneralSettingsData) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  writeValue(value: GeneralSettingsData): void {
    if (value?.cities !== undefined && value.cities.length > 0 && this.partner) {
      this.#mainPlanSettingsService
        .getCitiesByIds(this.partner.id, value.cities)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: cities => {
            if (cities.length > 0) {
              this.selectedCity.set({
                id: cities[0].id,
                title: cities[0].name,
              });
              this.#loadCitiesByName(cities[0].name);
            }
          },
          error: () => {
            this.selectedCity.set(undefined);
          },
        });
    } else {
      this.selectedCity.set(undefined);
    }

    if (value?.type !== undefined) {
      this.selectedType.set(this.typeOptions.find(opt => opt.id === value.type));
    } else {
      this.selectedType.set(undefined);
    }

    if (value?.category !== undefined) {
      this.selectedCategory.set(this.categoryOptions.find(opt => opt.id === value.category));
    } else {
      this.selectedCategory.set(undefined);
    }
  }

  #emitChange(): void {
    const cities = this.selectedCity() ? [this.selectedCity()!.id as number] : [];
    const type = this.selectedType()?.id as string | undefined;
    const category = this.selectedCategory()?.id as string | undefined;
    this.#onChange({ cities, type, category });
  }

  #initializeCategoryOptions(): void {
    this.categoryOptions = Object.entries(CATEGORY_LABELS).map(([apiValue, titleKey]) => ({
      id: apiValue,
      title: this.#translateService.instant(titleKey),
    }));
  }

  #initializeTypeOptions(): void {
    this.typeOptions = Object.entries(TYPE_LABELS).map(([apiValue, titleKey]) => ({
      id: apiValue,
      title: this.#translateService.instant(titleKey),
    }));
  }

  #loadCitiesByName(cityName: string): void {
    if (!this.partner) {
      return;
    }

    this.#mainPlanSettingsService
      .searchCities(this.partner.id, cityName)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: cities => {
          this.cityOptions.set(
            cities.map(city => ({
              id: city.id,
              title: city.name,
            })),
          );
        },
        error: () => {
          this.cityOptions.set([]);
        },
      });
  }

  #loadInitialCities(): void {
    if (!this.partner) {
      return;
    }

    this.#mainPlanSettingsService
      .searchCities(this.partner.id, '')
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: cities => {
          this.cityOptions.set(
            cities.map(city => ({
              id: city.id,
              title: city.name,
            })),
          );
        },
        error: () => {
          this.cityOptions.set([]);
        },
      });
  }

  #mapToSelectOptions(allowedValues: string[] | undefined, labels: Partial<Record<string, string>>): SelectOption[] {
    if (!allowedValues) {
      return [];
    }

    return allowedValues.map((apiValue: string) => {
      const translationKey = labels[apiValue];
      let title: string;

      if (translationKey !== undefined) {
        const translated = this.#translateService.instant(translationKey);
        title = translated !== translationKey ? translated : formatFallbackLabel(apiValue);
      } else {
        title = formatFallbackLabel(apiValue);
      }

      return {
        id: apiValue,
        title,
      };
    });
  }
}
