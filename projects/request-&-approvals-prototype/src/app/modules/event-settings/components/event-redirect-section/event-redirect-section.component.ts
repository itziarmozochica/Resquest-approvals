import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  input,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';

import { SelectOptionTypeaheadInput } from '@fz-original/app/core/tracking/core/events/select-option-typeahead';
import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { DropdownService } from '@fz-original/app/shared/dropdown/dropdown.service';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { PlanOption } from '@fz-original/app/shared/search-bar/models/plan-option.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntAlertComponent, IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { EventRedirectSectionConfig } from '../../models/settings-configs.model';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';

@Component({
  selector: 'app-event-redirect-section',
  templateUrl: './event-redirect-section.component.html',
  styleUrls: ['./event-redirect-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    IgntAlertComponent,
    FeverOnlyMarkerComponent,
    IgntIconComponent,
    IgntToggleComponent,
    IgntTooltipDirective,
    IgntTypeaheadModule,
    IgntWrapperCardComponent,
    NgIf,
    SharedComponentsModule,
    TranslateModule,
  ],
})
export class EventRedirectSectionComponent implements OnInit, OnChanges {
  private _plans: PlanOption[] = [];
  #dropdownService: DropdownService = inject(DropdownService);
  readonly #userService = inject(UserService);
  #translateService = inject(TranslateService);

  get canEditRedirectToId(): boolean {
    return this.config?.redirectToId.editable ?? true;
  }

  get isRedirectInteractionDisabled(): boolean {
    return !this.canEditRedirectToId || !this.canEditPlan();
  }
  get cityOptions(): SelectOption[] {
    return this.config?.cityOptions ?? [];
  }
  get plans(): PlanOption[] {
    return this._plans;
  }
  get redirectEnabled(): boolean {
    return this.config?.redirectEnabled ?? false;
  }
  readonly canEditPlan = input<boolean>(true);
  @Input() config: EventRedirectSectionConfig | null = null;

  initialCityOption: SelectOption = { id: -1, title: this.#translateService.instant('filters.allCities') };
  planOptions: WritableSignal<SelectOption[]> = signal([]);
  @Output() redirectConfigChange = new EventEmitter<number | null>();
  @Output() redirectEnabledChange = new EventEmitter<Event>();
  selectedCity: WritableSignal<SelectOption | null> = signal(null);
  selectedPlan: WritableSignal<SelectOption | null> = signal(null);
  selectOptionTypeaheadInput = SelectOptionTypeaheadInput;

  getPlanPlaceOptions(): void {
    const listPlanItems = this.plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      status: plan.status,
      places: plan.places,
      isAssetBased: plan.isAssetBased,
      nextSessionDate: plan.nextSessionDate ?? undefined,
      lastSessionDate: plan.lastSessionDate ?? undefined,
      nextSessionDateRegardlessOfAttendance: plan.nextSessionDateRegardlessOfAttendance ?? undefined,
      lastSessionDateRegardlessOfExpirationAndAttendance: plan.lastSessionDateRegardlessOfExpirationAndAttendance ?? undefined,
    }));
    this.planOptions.set(this.#dropdownService.getPlanDropdownOptions(listPlanItems));
  }

  isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this._plans = this.config.plans;
      this.getPlanPlaceOptions();

      if (this.config.inputSelectedCity) {
        this.selectedCity.set(this.config.inputSelectedCity);
        const listPlanItems = this.plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          status: plan.status,
          places: plan.places,
          isAssetBased: plan.isAssetBased,
          nextSessionDate: plan.nextSessionDate ?? undefined,
          lastSessionDate: plan.lastSessionDate ?? undefined,
          nextSessionDateRegardlessOfAttendance: plan.nextSessionDateRegardlessOfAttendance ?? undefined,
          lastSessionDateRegardlessOfExpirationAndAttendance: plan.lastSessionDateRegardlessOfExpirationAndAttendance ?? undefined,
        }));
        this.planOptions.set(this.#dropdownService.getPlanDropdownOptions(listPlanItems, this.config.inputSelectedCity.id));
      }

      if (this.config.inputSelectedPlan) {
        const selectOption: SelectOption = {
          id: this.config.inputSelectedPlan.id,
          title: this.config.inputSelectedPlan.name,
          status: this.config.inputSelectedPlan.status,
          kind: this.config.inputSelectedPlan.kind,
        };
        this.selectedPlan.set(selectOption);
      }
    }
  }

  ngOnInit(): void {
    if (!this.selectedCity()) {
      this.selectedCity.set(this.initialCityOption);
    }
  }

  onRedirectEnabledChange(event: Event): void {
    if (this.isRedirectInteractionDisabled) {
      return;
    }
    this.redirectEnabledChange.emit(event);
  }

  selectCity(option: SelectOption | null | undefined): void {
    if (this.isRedirectInteractionDisabled) {
      return;
    }
    this.selectedCity.set(option ?? null);
    if (option != null) {
      const listPlanItems = this.plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        status: plan.status,
        places: plan.places,
        isAssetBased: plan.isAssetBased,
        nextSessionDate: plan.nextSessionDate ?? undefined,
        lastSessionDate: plan.lastSessionDate ?? undefined,
        nextSessionDateRegardlessOfAttendance: plan.nextSessionDateRegardlessOfAttendance ?? undefined,
        lastSessionDateRegardlessOfExpirationAndAttendance: plan.lastSessionDateRegardlessOfExpirationAndAttendance ?? undefined,
      }));
      this.planOptions.set(this.#dropdownService.getPlanDropdownOptions(listPlanItems, this.selectedCity()?.id));
    } else {
      this.selectedCity.set(this.initialCityOption);
      this.getPlanPlaceOptions();
    }
  }

  selectPlan(option: SelectOption): void {
    if (this.isRedirectInteractionDisabled) {
      return;
    }
    this.selectedPlan.set(option);
    this.redirectConfigChange.emit(this.selectedPlan()?.id || null);
  }
}
